const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");
const {
  QueryClient,
  QueryObserver,
} = require("@tanstack/react-query");
const source = path.resolve(__dirname, "../src/lib/auth.ts");
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
const { clearAuthState } = loaded.exports;

test("退出保留被订阅的用户查询，立即通知游客状态并清除私人缓存", async () => {
  const client = new QueryClient();
  try {
    client.setQueryData(["user"], { id: "1", userName: "测试用户" });
    client.setQueryData(["private", "sign", "1"], [1, 2]);
    client.setQueryData(["catalog", "banks"], { records: [] });
    const original = client
      .getQueryCache()
      .find({ queryKey: ["user"], exact: true });
    const observer = new QueryObserver(client, {
      queryKey: ["user"],
      enabled: false,
    });
    const seen = [];
    const unsubscribe = observer.subscribe((result) => seen.push(result.data));
    await clearAuthState(client);
    assert.equal(
      client.getQueryCache().find({ queryKey: ["user"], exact: true }),
      original,
    );
    assert.equal(observer.getCurrentResult().data, null);
    assert.ok(seen.includes(null));
    assert.equal(client.getQueryData(["private", "sign", "1"]), undefined);
    assert.deepEqual(client.getQueryData(["catalog", "banks"]), {
      records: [],
    });
    unsubscribe();
  } finally {
    client.clear();
  }
});

test("退出取消待完成请求，迟到的旧用户响应不能恢复用户名", async () => {
  const client = new QueryClient();
  try {
    const oldUser = { id: "1", userName: "旧用户" };
    client.setQueryData(["user"], oldUser);
    let finish;
    let signal;
    const pending = client
      .fetchQuery({
        queryKey: ["user"],
        queryFn: (context) => {
          signal = context.signal;
          return new Promise((resolve) => {
            finish = resolve;
          });
        },
      })
      .catch((error) => error);
    await clearAuthState(client);
    assert.equal(signal.aborted, true);
    finish(oldUser);
    await pending;
    assert.equal(client.getQueryData(["user"]), null);
    client.setQueryData(["user"], { id: "2", userName: "新用户" });
    assert.equal(client.getQueryData(["user"]).userName, "新用户");
  } finally {
    client.clear();
  }
});
