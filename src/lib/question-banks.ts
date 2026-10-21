import type { api, Bank, Page, ApiError } from "./api";

export interface BankTarget {
  id: string;
  title: string;
}
export interface BankLinkFailure extends BankTarget {
  message: string;
}
export interface BankChange extends BankTarget {
  action: "add" | "remove";
}
export interface BankChangeFailure extends BankChange {
  message: string;
}

export async function loadQuestionBanks(
  questionId: string,
  request: typeof api,
  signal?: AbortSignal,
): Promise<BankTarget[]> {
  const ids = new Set<string>();
  let current = 1;
  let loaded = 0;
  while (true) {
    const page = await request<Page<{ questionBankId: string }>>(
      "/questionBankQuestion/list/page",
      {
        questionId,
        current,
        pageSize: 100,
        sortField: "id",
        sortOrder: "ascend",
      },
      "post",
      signal,
    );
    if (
      !page ||
      !Array.isArray(page.records) ||
      !Number.isFinite(Number(page.total)) ||
      Number(page.total) < 0
    )
      throw new Error("所属题库数据无效，请重新加载");
    if (!page.records.length && loaded < Number(page.total))
      throw new Error("所属题库数据不完整，请重新加载后再保存");
    page.records.forEach((record) => ids.add(record.questionBankId));
    loaded += page.records.length;
    if (loaded >= Number(page.total)) break;
    current++;
  }
  const banks: BankTarget[] = [];
  for (const id of Array.from(ids)) {
    try {
      const bank = await request<Bank>(
        "/questionBank/get/vo",
        { id },
        "get",
        signal,
      );
      banks.push({ id, title: bank.title });
    } catch (error) {
      if ((error as ApiError | undefined)?.code !== 40400) throw error;
      banks.push({ id, title: `题库（ID：${id}，已不存在）` });
    }
  }
  return banks;
}

export function questionBankChanges(
  before: BankTarget[],
  after: BankTarget[],
): BankChange[] {
  const old = new Map(before.map((bank) => [bank.id, bank]));
  const next = new Map(after.map((bank) => [bank.id, bank]));
  return [
    ...Array.from(next.values())
      .filter((bank) => !old.has(bank.id))
      .map((bank) => ({ ...bank, action: "add" as const })),
    ...Array.from(old.values())
      .filter((bank) => !next.has(bank.id))
      .map((bank) => ({ ...bank, action: "remove" as const })),
  ];
}

export async function applyQuestionBankChanges(
  questionId: string,
  changes: BankChange[],
  request: typeof api,
  verifyExisting = false,
): Promise<BankChangeFailure[]> {
  const failures: BankChangeFailure[] = [];
  for (const change of changes) {
    if (change.action === "add") {
      const result = await linkQuestionToBanks(
        questionId,
        [change],
        request,
        verifyExisting,
      );
      failures.push(
        ...result.map((failure) => ({ ...failure, action: "add" as const })),
      );
      continue;
    }
    try {
      if (verifyExisting) {
        const page = await request<Page<{ id: string }>>(
          "/questionBankQuestion/list/page",
          { questionId, questionBankId: change.id, current: 1, pageSize: 1 },
        );
        if (!page.records.length) continue;
      }
      const result = await request<boolean>(
        "/questionBankQuestion/remove/batch",
        { questionBankId: change.id, questionIdList: [questionId] },
      );
      if (result === false) throw new Error("移除关联未成功");
    } catch (error) {
      failures.push({
        ...change,
        message: error instanceof Error ? error.message : "移除关联失败",
      });
    }
  }
  return failures;
}

export async function linkQuestionToBanks(
  questionId: string,
  banks: BankTarget[],
  request: typeof api,
  verifyExisting = false,
): Promise<BankLinkFailure[]> {
  const failures: BankLinkFailure[] = [];
  for (const bank of banks) {
    try {
      // A timed-out association may have succeeded on the server. Check before retrying.
      if (verifyExisting) {
        const existing = await request<Page<{ id: string }>>(
          "/questionBankQuestion/list/page",
          { questionBankId: bank.id, questionId, current: 1, pageSize: 1 },
        );
        if (existing.records.length) continue;
      }
      const result = await request<boolean>("/questionBankQuestion/add/batch", {
        questionBankId: bank.id,
        questionIdList: [questionId],
      });
      if (result === false) throw new Error("关联操作未成功");
    } catch (error) {
      failures.push({
        ...bank,
        message: error instanceof Error ? error.message : "关联失败，请重试",
      });
    }
  }
  return failures;
}
