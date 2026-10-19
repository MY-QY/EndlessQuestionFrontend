const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");
const dayjs = require("dayjs");
const source = path.resolve(__dirname, "../src/lib/sign-calendar.ts");
const compiled = ts.transpileModule(fs.readFileSync(source, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;
const loaded = { exports: {} };
new Function("require", "module", "exports", compiled)(
  createRequire(source),
  loaded,
  loaded.exports,
);
const { monthCalendar } = loaded.exports;
test("闰年年内第60天对应二月29日，统计仅包含当前月", () => {
  const result = monthCalendar(
    dayjs("2024-02-01"),
    [1, 32, 60, 61, 60, 0, 367],
    dayjs("2024-03-01"),
  );
  assert.equal(result.cells.filter(Boolean).length, 29);
  assert.equal(result.monthCount, 2);
  assert.equal(result.yearCount, 4);
  assert.equal(
    result.cells.find((date) => date?.date === "2024-02-29").signed,
    true,
  );
});
test("周一开始的月份无前置空位，周日开始的月份空出六天", () => {
  assert.equal(monthCalendar(dayjs("2024-01-01"), []).cells[0].day, 1);
  const result = monthCalendar(dayjs("2025-06-01"), []);
  assert.ok(result.cells.slice(0, 6).every((date) => date === null));
  assert.equal(result.cells[6].day, 1);
  assert.equal(result.cells.length % 7, 0);
});
test("平年不生成二月29日，今天和未来日期有独立状态", () => {
  const result = monthCalendar(dayjs("2025-02-01"), [32], dayjs("2025-02-10"));
  assert.equal(result.cells.filter(Boolean).length, 28);
  assert.equal(result.cells.find((date) => date?.day === 10).today, true);
  assert.equal(result.cells.find((date) => date?.day === 11).future, true);
  assert.equal(result.cells.find((date) => date?.day === 9).future, false);
});
test("跨年切月后年内天数从1开始重新映射", () => {
  const next = dayjs("2025-12-01").add(1, "month");
  const result = monthCalendar(next, [1], dayjs("2026-01-01"));
  assert.equal(result.cells.find((date) => date?.day === 1).date, "2026-01-01");
  assert.equal(result.cells.find((date) => date?.day === 1).signed, true);
});
