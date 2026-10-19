const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");
const source = path.resolve(__dirname, "../src/lib/api.ts");
const compiled = ts.transpileModule(fs.readFileSync(source, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const loaded = { exports: {} };
new Function("require", "module", "exports", compiled)(
  createRequire(source),
  loaded,
  loaded.exports,
);
const { api, http, ApiError } = loaded.exports;
const originalAdapter = http.defaults.adapter;
afterEach(() => {
  http.defaults.adapter = originalAdapter;
  delete global.window;
  delete global.sessionStorage;
});
function respond(config, data) {
  return { data, status: 200, statusText: "OK", headers: {}, config };
}
test("GET 参数保留大整数字符串，统一解包业务数据并携带 Cookie", async () => {
  const id = "9223372036854775806";
  http.defaults.adapter = async (config) => {
    assert.equal(config.params.id, id);
    assert.equal(config.method, "get");
    assert.equal(config.withCredentials, true);
    return respond(config, { code: 0, data: { id } });
  };
  assert.deepEqual(await api("/question/get/vo", { id }, "get"), { id });
});
test("HTTP 200 中的登录失效必须拒绝并清理登录态", async () => {
  let expired = 0;
  global.window = {
    dispatchEvent: (event) => {
      if (event.type === "auth-expired") expired++;
    },
  };
  http.defaults.adapter = async (config) =>
    respond(config, { code: 40100, message: "未登录" });
  await assert.rejects(
    api("/user/update/my", {}),
    (e) => e instanceof ApiError && e.code === 40100,
  );
  assert.equal(expired, 1);
});
test("初始化游客登录态不触发全局登录失效事件", async () => {
  let expired = 0;
  global.window = { dispatchEvent: () => expired++ };
  http.defaults.adapter = async (config) =>
    respond(config, { code: 40100, message: "未登录" });
  await assert.rejects(api("/user/get/login", {}, "get"));
  assert.equal(expired, 0);
});
test("收到频率告警后阻止后续详情网络请求", async () => {
  const values = new Map();
  let calls = 0;
  global.window = { dispatchEvent() {} };
  global.sessionStorage = {
    setItem: (key, value) => values.set(key, value),
    getItem: (key) => values.get(key),
  };
  http.defaults.adapter = async (config) => {
    calls++;
    return respond(config, { code: 110, message: "访问太频繁" });
  };
  await assert.rejects(
    api("/question/get/vo", { id: "1" }, "get"),
    (e) => e.code === 110,
  );
  await assert.rejects(
    api("/question/get/vo", { id: "2" }, "get"),
    (e) => e.code === 110,
  );
  assert.equal(calls, 1);
});
test("文件上传保留 FormData，不手工拼接 multipart boundary", async () => {
  const data = new FormData();
  data.append("biz", "user_avatar");
  data.append("file", new Blob(["image"]), "avatar.png");
  http.defaults.adapter = async (config) => {
    assert.equal(config.data.get("biz"), "user_avatar");
    return respond(config, { code: 0, data: "https://example.com/avatar.png" });
  };
  assert.equal(
    await api("/file/upload", data),
    "https://example.com/avatar.png",
  );
});
