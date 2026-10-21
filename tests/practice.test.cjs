const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");
const source = path.resolve(__dirname, "../src/lib/practice.ts");
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
const { practiceHref } = loaded.exports;
test("独立刷题保留筛选条件与跨页页码，不生成不存在的题库路径", () => {
  const href = practiceHref(
    "9223372036854775806",
    undefined,
    3,
    "&q=Java&tag=React&mode=fulltext",
  );
  const url = new URL(href, "http://localhost");
  assert.equal(url.pathname, "/questions/9223372036854775806");
  assert.equal(url.searchParams.get("page"), "3");
  assert.equal(url.searchParams.get("q"), "Java");
  assert.equal(url.searchParams.get("tag"), "React");
  assert.equal(url.searchParams.get("mode"), null);
});
test("题库刷题保持题库范围，兼容最近刷题记录中已编码的中文条件", () => {
  const href = practiceHref("93001", "92001", 2, "&q=%E9%9B%86%E5%90%88");
  const url = new URL(href, "http://localhost");
  assert.equal(url.pathname, "/banks/92001/questions/93001");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("q"), "集合");
});
test("直接刷题默认第一目录页，异常页码也安全回退", () => {
  assert.equal(practiceHref("1"), "/questions/1?page=1");
  assert.equal(practiceHref("1", undefined, Infinity), "/questions/1?page=1");
  assert.equal(practiceHref("1", undefined, -3), "/questions/1?page=1");
});
test("旧搜索模式链接统一忽略mode，保留关键词与原有单标签", () => {
  for (const mode of ["fulltext", "normal", ""]) {
    const href = practiceHref(
      "93001",
      undefined,
      2,
      `&q=%E9%9B%86%E5%90%88&tag=Java&mode=${mode}`,
    );
    const url = new URL(href, "http://localhost");
    assert.equal(url.searchParams.has("mode"), false);
    assert.equal(url.searchParams.get("q"), "集合");
    assert.equal(url.searchParams.get("tag"), "Java");
    assert.equal(url.searchParams.get("page"), "2");
  }
});
