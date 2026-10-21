const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const source = path.resolve(__dirname, "../src/lib/question-banks.ts");
const compiled = ts.transpileModule(fs.readFileSync(source, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const loaded = { exports: {} };
new Function("require", "module", "exports", compiled)(
  require,
  loaded,
  loaded.exports,
);
const { linkQuestionToBanks } = loaded.exports;
test("未选题库时不发送关联请求", async () => {
  assert.deepEqual(
    await linkQuestionToBanks("93001", [], () => assert.fail("不应发送请求")),
    [],
  );
});
test("多题库分别建立关联，失败不会阻断其他题库，返回准确失败项", async () => {
  const calls = [];
  const banks = [
    { id: "1", title: "Java" },
    { id: "2", title: "Spring" },
    { id: "3", title: "MySQL" },
  ];
  const failures = await linkQuestionToBanks(
    "9223372036854775806",
    banks,
    async (url, data) => {
      calls.push({ url, data });
      if (data.questionBankId === "2") throw new Error("服务不可用");
      return true;
    },
  );
  assert.equal(calls.length, 3);
  assert.deepEqual(failures, [
    { id: "2", title: "Spring", message: "服务不可用" },
  ]);
  assert.ok(
    calls.every((call) => call.url === "/questionBankQuestion/add/batch"),
  );
  assert.deepEqual(calls[0].data.questionIdList, ["9223372036854775806"]);
});
test("重试只处理失败题库，且已存在的关联无需再次写入", async () => {
  const calls = [];
  const failed = [
    { id: "2", title: "Spring", message: "超时" },
    { id: "3", title: "MySQL", message: "超时" },
  ];
  const result = await linkQuestionToBanks(
    "93001",
    failed,
    async (url, data) => {
      calls.push({ url, data });
      if (url.endsWith("/list/page"))
        return {
          records: data.questionBankId === "2" ? [{ id: "77" }] : [],
          total: 0,
        };
      return true;
    },
    true,
  );
  assert.deepEqual(result, []);
  assert.equal(
    calls.filter((call) => call.url.endsWith("/add/batch")).length,
    1,
  );
  assert.equal(
    calls.find((call) => call.url.endsWith("/add/batch")).data.questionBankId,
    "3",
  );
  assert.ok(calls.every((call) => call.url !== "/question/add"));
});
test("重试检查失败或服务返回false时保留失败状态", async () => {
  const bank = { id: "1", title: "Java" };
  const failures = await linkQuestionToBanks(
    "93001",
    [bank],
    async () => {
      throw new Error("查询失败");
    },
    true,
  );
  assert.equal(failures[0].message, "查询失败");
  const result = await linkQuestionToBanks("93001", [bank], async () => false);
  assert.equal(result.length, 1);
});
const { loadQuestionBanks, questionBankChanges, applyQuestionBankChanges } =
  loaded.exports;
test("编辑前加载所有关联分页，回填完整的题库名称和ID", async () => {
  const pages = [];
  const banks = await loadQuestionBanks("93001", async (url, data) => {
    if (url.endsWith("/list/page")) {
      pages.push(data.current);
      return {
        records: [{ questionBankId: String(data.current) }],
        total: "2",
      };
    }
    return { id: data.id, title: `题库${data.id}` };
  });
  assert.deepEqual(pages, [1, 2]);
  assert.deepEqual(banks, [
    { id: "1", title: "题库1" },
    { id: "2", title: "题库2" },
  ]);
});
test("关联分页不完整或查询失败时拒绝回填空选项", async () => {
  await assert.rejects(
    loadQuestionBanks("93001", async (url, data) => ({
      records: data.current === 1 ? [{ questionBankId: "1" }] : [],
      total: 2,
    })),
    /不完整/,
  );
  await assert.rejects(
    loadQuestionBanks("93001", async () => {
      throw new Error("服务不可用");
    }),
    /服务不可用/,
  );
});
test("编辑只提交增删差异，不改动保留的题库", async () => {
  const before = [
    { id: "1", title: "Java" },
    { id: "2", title: "Spring" },
  ];
  const after = [
    { id: "2", title: "Spring" },
    { id: "3", title: "MySQL" },
  ];
  const changes = questionBankChanges(before, after);
  assert.deepEqual(changes, [
    { id: "3", title: "MySQL", action: "add" },
    { id: "1", title: "Java", action: "remove" },
  ]);
  const calls = [];
  assert.deepEqual(
    await applyQuestionBankChanges("93001", changes, async (url, data) => {
      calls.push({ url, data });
      return true;
    }),
    [],
  );
  assert.deepEqual(
    calls.map((call) => call.url),
    ["/questionBankQuestion/add/batch", "/questionBankQuestion/remove/batch"],
  );
  assert.ok(calls.every((call) => call.data.questionBankId !== "2"));
  assert.deepEqual(questionBankChanges(before, before), []);
});
test("清空所属题库只删除关联，不调用题目删除接口", async () => {
  const changes = questionBankChanges([{ id: "1", title: "Java" }], []);
  let count = 0;
  await applyQuestionBankChanges("93001", changes, async (url, data) => {
    count++;
    assert.equal(url, "/questionBankQuestion/remove/batch");
    assert.deepEqual(data.questionIdList, ["93001"]);
    return true;
  });
  assert.equal(count, 1);
});
test("移除部分失败保留操作类型，重试已移除关联不重复写入", async () => {
  const changes = [{ id: "1", title: "Java", action: "remove" }];
  const failures = await applyQuestionBankChanges(
    "93001",
    changes,
    async () => {
      throw new Error("网络错误");
    },
  );
  assert.equal(failures[0].action, "remove");
  const urls = [];
  assert.deepEqual(
    await applyQuestionBankChanges(
      "93001",
      failures,
      async (url) => {
        urls.push(url);
        return { records: [], total: 0 };
      },
      true,
    ),
    [],
  );
  assert.deepEqual(urls, ["/questionBankQuestion/list/page"]);
});
