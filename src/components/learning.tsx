"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Empty,
  Input,
  Pagination,
  Skeleton,
  Space,
  Tag,
} from "antd";
import {
  ArrowRightOutlined,
  BookOutlined,
  ReadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, ApiError, Bank, errorText, Page, Question } from "@/lib/api";
import { useAuth } from "./providers";
import { practiceHref } from "@/lib/practice";

export function Failure({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <Alert
      type="error"
      showIcon
      message={errorText(error)}
      action={
        retry && (
          <Button size="small" onClick={retry}>
            重试
          </Button>
        )
      }
    />
  );
}
export function Markdown({ text }: { text?: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {text || "暂无内容"}
      </ReactMarkdown>
    </div>
  );
}
function BankCards({ items }: { items: Bank[] }) {
  return (
    <div className="bank-grid">
      {items.map((bank, index) => (
        <Link href={`/banks/${bank.id}`} key={bank.id} className="bank-card">
          <div className={`bank-art art-${index % 4}`}>
            {bank.picture ? (
              <Image
                src={bank.picture}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 720px) 45vw, 25vw"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <BookOutlined />
            )}
            <span>QUESTION COLLECTION</span>
          </div>
          <div className="bank-card-body">
            <h3>{bank.title}</h3>
            <p>{bank.description || "从一道题开始，构建你的知识体系。"}</p>
            <div className="card-bottom">
              <span>{bank.user?.userName || "题海无涯"}</span>
              <span>
                进入题库 <ArrowRightOutlined />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
function QuestionRows({
  items,
  bankId,
  offset = 0,
  context = "",
}: {
  items: Question[];
  bankId?: string;
  offset?: number;
  context?: string;
}) {
  return (
    <div className="question-list">
      {items.map((q, i) => (
        <Link
          key={q.id}
          className="question-row"
          href={practiceHref(
            q.id,
            bankId,
            Math.floor((offset + i) / 20) + 1,
            context,
          )}
        >
          <span className="question-number">
            {String(offset + i + 1).padStart(2, "0")}
          </span>
          <div>
            <h3>{q.title}</h3>
            <Space size={4} wrap>
              {q.tagList?.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </div>
          <ArrowRightOutlined className="row-arrow" />
        </Link>
      ))}
    </div>
  );
}
export function HomePage() {
  const router = useRouter();
  const [recent, setRecent] = useState<{
    id: string;
    title: string;
    bankId?: string;
    page?: number;
    context?: string;
  }>();
  useEffect(() => {
    try {
      const value = localStorage.getItem("thyw-recent");
      if (value) setRecent(JSON.parse(value));
    } catch {}
  }, []);
  const banks = useQuery({
    queryKey: ["home-banks"],
    queryFn: ({ signal }) =>
      api<Page<Bank> | null>(
        "/questionBank/list/page/vo",
        {
          current: 1,
          pageSize: 4,
          sortField: "createTime",
          sortOrder: "descend",
        },
        "post",
        signal,
      ),
  });
  const questions = useQuery({
    queryKey: ["home-questions"],
    queryFn: ({ signal }) =>
      api<Page<Question>>(
        "/question/list/page/vo",
        {
          current: 1,
          pageSize: 5,
          sortField: "createTime",
          sortOrder: "descend",
        },
        "post",
        signal,
      ),
  });
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span /> YOUR NEXT CHAPTER STARTS HERE
          </div>
          <h1>
            学海有路，
            <br />
            每一道题都是<span>新的起点。</span>
          </h1>
          <p>
            在思考中理解，在积累中成长。
            <br />
            找到适合你的题库，让每一次学习都有收获。
          </p>
          <Input.Search
            size="large"
            placeholder="搜索感兴趣的题目…"
            aria-label="搜索感兴趣的题目"
            enterButton={<SearchOutlined />}
            onSearch={(value) =>
              router.push(`/questions?q=${encodeURIComponent(value.trim())}`)
            }
          />
          <div className="hero-actions">
            <Link href="/banks">
              <Button type="primary" size="large">
                探索题库 <ArrowRightOutlined />
              </Button>
            </Link>
            {recent && (
              <Link
                href={practiceHref(
                  recent.id,
                  recent.bankId,
                  recent.page || 1,
                  recent.context || "",
                )}
              >
                <Button size="large">继续刷题</Button>
              </Link>
            )}
          </div>
        </div>
        <div className="hero-illustration" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="floating-note note-one">知识，在思考中连接</div>
          <div className="book-stack">
            <ReadOutlined />
            <span>
              LEARN SOMETHING
              <br />
              <b>NEW EVERY DAY.</b>
            </span>
          </div>
          <div className="floating-note note-two">✦ 一点积累，无限可能</div>
          <span className="hero-spark">✳</span>
        </div>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">EXPLORE & LEARN</span>
            <h2>发现你的下一本题库</h2>
            <p>循序渐进，把零散知识串成体系。</p>
          </div>
          <Link href="/banks">
            全部题库 <ArrowRightOutlined />
          </Link>
        </div>
        {banks.isPending ? (
          <Skeleton active />
        ) : banks.error ? (
          <Failure error={banks.error} retry={() => void banks.refetch()} />
        ) : banks.data === null ? (
          <Alert
            message="题库服务暂时降级，请稍后重试"
            action={<Button onClick={() => void banks.refetch()}>重试</Button>}
          />
        ) : banks.data?.records.length ? (
          <BankCards items={banks.data.records} />
        ) : (
          <Empty description="题库正在准备中" />
        )}
      </section>
      <section className="home-bottom">
        <div className="panel">
          <div className="section-heading compact">
            <h2>近期题目</h2>
            <Link href="/questions">查看全部 →</Link>
          </div>
          {questions.isPending ? (
            <Skeleton active />
          ) : questions.error ? (
            <Failure
              error={questions.error}
              retry={() => void questions.refetch()}
            />
          ) : questions.data?.records.length ? (
            <QuestionRows items={questions.data.records} />
          ) : (
            <Empty description="暂无题目" />
          )}
        </div>
        <aside className="learning-note">
          <span className="eyebrow">A LITTLE EVERY DAY</span>
          <h2>
            不求一日千里，
            <br />
            但求每日一题。
          </h2>
          <p>
            先独立思考，再展开答案。
            <br />
            比记住答案更重要的，是理解为什么。
          </p>
          <Link href="/user/profile">
            <Button>
              记录今天的坚持 <ArrowRightOutlined />
            </Button>
          </Link>
        </aside>
      </section>
    </>
  );
}
export function Catalog({
  kind,
  bankId,
}: {
  kind: "banks" | "questions";
  bankId?: string;
}) {
  const search = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const current = Math.max(1, Number(search.get("page")) || 1);
  const keyword = search.get("q") || "";
  const tag = search.get("tag") || "";
  const fulltext = search.get("mode") === "fulltext";
  const [input, setInput] = useState(keyword);
  const [tagInput, setTagInput] = useState(tag);
  useEffect(() => {
    setInput(keyword);
    setTagInput(tag);
  }, [keyword, tag]);
  useEffect(() => {
    if (input.trim() === keyword) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(search.toString());
      if (input.trim()) params.set("q", input.trim());
      else params.delete("q");
      params.set("page", "1");
      router.replace(`${path}?${params}`, { scroll: false });
    }, 450);
    return () => clearTimeout(timer);
  }, [input, keyword, search, path, router]);
  function update(values: Record<string, string>) {
    const params = new URLSearchParams(search.toString());
    Object.entries(values).forEach(([key, value]) =>
      value ? params.set(key, value) : params.delete(key),
    );
    router.push(`${path}?${params}`, { scroll: false });
  }
  const bank = useQuery({
    queryKey: ["bank", bankId],
    queryFn: ({ signal }) =>
      api<Bank>("/questionBank/get/vo", { id: bankId }, "get", signal),
    enabled: !!bankId,
  });
  const query = useQuery({
    queryKey: ["catalog", kind, bankId, current, keyword, tag, fulltext],
    queryFn: ({ signal }) =>
      api<Page<Question & Bank> | null>(
        kind === "banks"
          ? "/questionBank/list/page/vo"
          : fulltext
            ? "/question/search/page/vo"
            : "/question/list/page/vo",
        {
          current,
          pageSize: 12,
          ...(fulltext ? { searchText: keyword } : { title: keyword }),
          ...(tag ? { tags: [tag] } : {}),
          questionBankId: bankId,
          sortField: "createTime",
          sortOrder: "descend",
        },
        "post",
        signal,
      ),
  });
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">
          {bankId
            ? "COLLECTION"
            : kind === "banks"
              ? "KNOWLEDGE COLLECTIONS"
              : "EXPLORE QUESTIONS"}
        </span>
        <h1>
          {bankId
            ? bank.data?.title || "题库详情"
            : kind === "banks"
              ? "每一份题库，都是一条成长路径。"
              : "让问题带你走得更远。"}
        </h1>
        <p>
          {bankId
            ? bank.data?.description
            : kind === "banks"
              ? "挑选一个方向，开始今天的学习。"
              : "搜索题目、发现知识，找到属于你的思考方向。"}
        </p>
        {bankId && query.data?.records[0] && (
          <Link
            href={`/banks/${bankId}/questions/${query.data.records[0].id}?page=${Math.floor(((current - 1) * 12) / 20) + 1}&q=${encodeURIComponent(keyword)}&tag=${encodeURIComponent(tag)}&mode=${fulltext ? "fulltext" : ""}`}
          >
            <Button type="primary">
              开始刷题 <ArrowRightOutlined />
            </Button>
          </Link>
        )}
      </div>
      {bank.error ? (
        <Failure error={bank.error} />
      ) : (
        <>
          <div className="filter-bar">
            <Input.Search
              aria-label="搜索"
              placeholder={kind === "banks" ? "搜索题库标题" : "搜索题目"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onSearch={(q) => update({ q: q.trim(), page: "1" })}
              enterButton="搜索"
            />
            {kind === "questions" && (
              <>
                <Input
                  placeholder="标签，按回车筛选"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onPressEnter={() =>
                    update({ tag: tagInput.trim(), page: "1" })
                  }
                />
                <Button
                  type={fulltext ? "primary" : "default"}
                  onClick={() =>
                    update({ mode: fulltext ? "" : "fulltext", page: "1" })
                  }
                >
                  {fulltext ? "全文搜索" : "普通查询"}
                </Button>
              </>
            )}
          </div>
          {query.isPending ? (
            <Skeleton active />
          ) : query.error ? (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Failure error={query.error} retry={() => void query.refetch()} />
              {fulltext && (
                <Button onClick={() => update({ mode: "", page: "1" })}>
                  切换普通查询
                </Button>
              )}
            </Space>
          ) : query.data === null ? (
            <Alert
              message="服务暂时降级，暂无法获取列表"
              action={
                <Button onClick={() => void query.refetch()}>重试</Button>
              }
            />
          ) : !query.data?.records.length ? (
            <Empty description="没有找到相关内容，试试其他关键词" />
          ) : (
            <>
              {kind === "banks" ? (
                <BankCards items={query.data.records} />
              ) : (
                <div className="panel">
                  <QuestionRows
                    items={query.data.records}
                    bankId={bankId}
                    offset={(current - 1) * 12}
                    context={`&q=${encodeURIComponent(keyword)}&tag=${encodeURIComponent(tag)}&mode=${fulltext ? "fulltext" : ""}`}
                  />
                </div>
              )}
              <Pagination
                className="pagination"
                current={current}
                pageSize={12}
                total={Number(query.data.total)}
                showSizeChanger={false}
                onChange={(page) => update({ page: String(page) })}
                showTotal={(total) => `共 ${total} 条`}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
export function QuestionDetail({
  id,
  bankId,
}: {
  id: string;
  bankId?: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const current = Math.max(1, Number(search.get("page")) || 1);
  const [show, setShow] = useState(false);
  const keyword = search.get("q") || "";
  const tag = search.get("tag") || "";
  const fulltext = search.get("mode") === "fulltext";
  const context = `&q=${encodeURIComponent(keyword)}&tag=${encodeURIComponent(tag)}&mode=${fulltext ? "fulltext" : ""}`;
  const query = useQuery({
    queryKey: ["question", id, user?.id],
    queryFn: ({ signal }) =>
      api<Question>("/question/get/vo", { id }, "get", signal),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    enabled: !loading,
  });
  const directory = useQuery({
    queryKey: ["directory", bankId, current, keyword, tag, fulltext],
    queryFn: ({ signal }) =>
      api<Page<Question>>(
        fulltext ? "/question/search/page/vo" : "/question/list/page/vo",
        {
          questionBankId: bankId,
          current,
          pageSize: 20,
          sortField: "createTime",
          sortOrder: "descend",
          ...(fulltext ? { searchText: keyword } : { title: keyword }),
          ...(tag ? { tags: [tag] } : {}),
        },
        "post",
        signal,
      ),
  });
  useEffect(() => {
    setShow(false);
  }, [id]);
  useEffect(() => {
    if (query.data) {
      try {
        localStorage.setItem(
          "thyw-recent",
          JSON.stringify({
            id,
            bankId,
            title: query.data.title,
            page: current,
            context,
          }),
        );
      } catch {}
    }
  }, [query.data, id, bankId, current, context]);
  const items = directory.data?.records || [];
  const index = items.findIndex((q) => q.id === id);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState("");
  async function move(delta: number) {
    if (index < 0 || moving) return;
    setMoving(true);
    setMoveError("");
    try {
      let page = current;
      let target = items[index + delta];
      if (!target && index >= 0) {
        page += delta;
        const next = await api<Page<Question>>(
          fulltext ? "/question/search/page/vo" : "/question/list/page/vo",
          {
            questionBankId: bankId,
            current: page,
            pageSize: 20,
            sortField: "createTime",
            sortOrder: "descend",
            ...(fulltext ? { searchText: keyword } : { title: keyword }),
            ...(tag ? { tags: [tag] } : {}),
          },
        );
        target =
          delta > 0 ? next.records[0] : next.records[next.records.length - 1];
      }
      if (target) router.push(practiceHref(target.id, bankId, page, context));
    } catch (e) {
      setMoveError(errorText(e));
    } finally {
      setMoving(false);
    }
  }
  return (
    <>
      <div className="breadcrumb">
        <Link
          href={`${bankId ? `/banks/${bankId}` : "/questions"}?page=1${context}`}
        >
          {bankId ? "返回题库" : "全部题目"}
        </Link>
        <span>/</span>刷题练习
      </div>
      <div className="reading-layout">
        <aside className="panel directory">
          <h3>题目目录</h3>
          <p className="muted">
            {bankId ? "当前题库" : keyword || tag ? "当前筛选结果" : "全部题目"}
          </p>
          {!directory.isPending && !directory.error && index < 0 && (
            <Alert
              className="directory-note"
              type="info"
              showIcon
              message="当前题目不在本页目录，可切换目录页或选择其他题目"
            />
          )}
          {directory.isPending ? (
            <Skeleton active />
          ) : directory.error ? (
            <Failure
              error={directory.error}
              retry={() => void directory.refetch()}
            />
          ) : items.length ? (
            items.map((q, i) => (
              <Link
                prefetch={false}
                href={practiceHref(q.id, bankId, current, context)}
                className={q.id === id ? "selected" : ""}
                key={q.id}
              >
                <span>{(current - 1) * 20 + i + 1}.</span>
                {q.title}
              </Link>
            ))
          ) : (
            <Empty description="暂无题目" />
          )}
          <Pagination
            simple
            size="small"
            current={current}
            pageSize={20}
            total={Number(directory.data?.total || 0)}
            onChange={(page) => router.replace(`?page=${page}${context}`)}
          />
        </aside>
        <article className="panel question-article">
          {query.isPending ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : query.error ? (
            <>
              <Failure
                error={query.error}
                retry={
                  query.error instanceof ApiError &&
                  [40101].includes(query.error.code)
                    ? undefined
                    : () => void query.refetch()
                }
              />
              {query.error instanceof ApiError &&
                query.error.code === 40100 && (
                  <Link
                    href={`/user/login?returnUrl=${encodeURIComponent(practiceHref(id, bankId, current, context))}`}
                  >
                    前往登录
                  </Link>
                )}
            </>
          ) : (
            query.data && (
              <>
                <span className="eyebrow">THINK FIRST, THEN EXPLORE</span>
                <h1>{query.data.title}</h1>
                <Space wrap>
                  {query.data.tagList?.map((tag) => (
                    <Tag key={tag} color="blue">
                      {tag}
                    </Tag>
                  ))}
                </Space>
                <p className="muted">
                  {query.data.user?.userName || "题海无涯"} ·{" "}
                  {query.data.createTime?.slice(0, 10)}
                </p>
                <Markdown text={query.data.content} />
                <div className="answer-heading">
                  <h2>参考答案</h2>
                  <Button
                    type={show ? "default" : "primary"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? "收起答案" : "展开答案"}
                  </Button>
                </div>
                {show ? (
                  <Markdown text={query.data.answer} />
                ) : (
                  <div className="answer-placeholder">
                    先给自己一点思考的时间，再与答案相遇。
                  </div>
                )}
                {moveError && <Alert type="error" message={moveError} />}{" "}
                <div className="reading-controls">
                  <Button
                    loading={moving}
                    disabled={
                      moving || index < 0 || (index === 0 && current === 1)
                    }
                    onClick={() => move(-1)}
                  >
                    上一题
                  </Button>
                  <Link
                    href={`${bankId ? `/banks/${bankId}` : "/questions"}?page=1${context}`}
                  >
                    {bankId ? "返回题库" : "返回题目列表"}
                  </Link>
                  <Button
                    loading={moving}
                    disabled={
                      moving ||
                      index < 0 ||
                      (index >= items.length - 1 &&
                        current * 20 >= Number(directory.data?.total || 0))
                    }
                    onClick={() => move(1)}
                  >
                    下一题
                  </Button>
                </div>
              </>
            )
          )}
        </article>
      </div>
    </>
  );
}
