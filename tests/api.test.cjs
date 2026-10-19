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
const { api, ApiError } = loaded.exports;
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  delete global.window;
  delete global.sessionStorage;
});
const respond = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
test("GET正确编码中文、特殊字符、数组和字符串ID，携带Cookie", async () => {
  global.fetch = async (url, init) => {
    const parsed = new URL(url, "http://localhost");
    assert.equal(parsed.pathname, "/api/question/get/vo");
    assert.equal(parsed.searchParams.get("id"), "9223372036854775806");
    assert.equal(parsed.searchParams.get("q"), "集合 & Java");
    assert.deepEqual(parsed.searchParams.getAll("tags"), ["Java", "前端"]);
    assert.equal(parsed.searchParams.has("missing"), false);
    assert.equal(init.credentials, "include");
    assert.equal(init.method, "GET");
    return respond({ code: 0, data: { id: parsed.searchParams.get("id") } });
  };
  assert.deepEqual(
    await api(
      "/question/get/vo",
      {
        id: "9223372036854775806",
        q: "集合 & Java",
        tags: ["Java", "前端"],
        missing: undefined,
      },
      "get",
    ),
    { id: "9223372036854775806" },
  );
});
test("POST发送JSON并解包成功响应", async () => {
  global.fetch = async (url, init) => {
    assert.equal(init.method, "POST");
    assert.equal(init.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(init.body), { title: "测试题目" });
    return respond({ code: 0, data: true });
  };
  assert.equal(await api("/question/add", { title: "测试题目" }), true);
});
test("HTTP 200业务登录失效触发清理，游客初始化不触发", async () => {
  let count = 0;
  global.window = {
    dispatchEvent: (event) => {
      if (event.type === "auth-expired") count++;
    },
  };
  global.fetch = async () => respond({ code: 40100, message: "未登录" });
  await assert.rejects(
    api("/user/update/my", {}),
    (e) => e instanceof ApiError && e.code === 40100,
  );
  assert.equal(count, 1);
  await assert.rejects(api("/user/get/login", {}, "get"));
  assert.equal(count, 1);
});
test("频率告警后阻止后续详情请求", async () => {
  const values = new Map();
  let calls = 0;
  global.window = { dispatchEvent() {} };
  global.sessionStorage = {
    setItem: (k, v) => values.set(k, v),
    getItem: (k) => values.get(k),
  };
  global.fetch = async () => {
    calls++;
    return respond({ code: 110, message: "访问太频繁" });
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
test("上传直接发送FormData且不设置Content-Type", async () => {
  const data = new FormData();
  data.append("biz", "user_avatar");
  data.append("file", new Blob(["image"]), "avatar.png");
  global.fetch = async (url, init) => {
    assert.equal(init.body, data);
    assert.equal(init.headers, undefined);
    return respond({ code: 0, data: "https://example.com/avatar.png" });
  };
  assert.equal(
    await api("/file/upload", data),
    "https://example.com/avatar.png",
  );
});
test("HTTP失败不能被业务code=0误判为成功，非JSON响应映射错误", async () => {
  global.fetch = async () => respond({ code: 0, data: true }, 403);
  await assert.rejects(api("/question/add", {}), (e) => e.code === 40101);
  global.fetch = async () => new Response("Bad Gateway", { status: 502 });
  await assert.rejects(
    api("/question/list/page/vo", {}),
    (e) => e.code === 50000,
  );
});
test("无效成功响应与网络错误有可读提示", async () => {
  global.fetch = async () => new Response("<html>oops</html>", { status: 200 });
  await assert.rejects(api("/user/get/login", {}, "get"), /无法识别/);
  global.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  await assert.rejects(api("/user/get/login", {}, "get"), /无法连接/);
});
test("外部取消信号中止fetch，预先取消不发送请求", async () => {
  const external = new AbortController();
  let observed;
  global.fetch = (url, init) =>
    new Promise((resolve, reject) => {
      observed = init.signal;
      init.signal.addEventListener("abort", () =>
        reject(new DOMException("Aborted", "AbortError")),
      );
    });
  const pending = api("/question/list/page/vo", {}, "post", external.signal);
  external.abort();
  await assert.rejects(pending, (e) => e.name === "AbortError");
  assert.equal(observed.aborted, true);
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return respond({ code: 0, data: true });
  };
  await assert.rejects(
    api("/user/get/login", {}, "get", external.signal),
    (e) => e.name === "AbortError",
  );
  assert.equal(calls, 0);
});
test("15秒超时中止请求并给出超时提示", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  global.fetch = (url, init) =>
    new Promise((resolve, reject) =>
      init.signal.addEventListener("abort", () =>
        reject(new DOMException("Aborted", "AbortError")),
      ),
    );
  const pending = api("/user/get/login", {}, "get");
  const assertion = assert.rejects(pending, /请求超时/);
  t.mock.timers.tick(15000);
  await assertion;
});
