"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Spin, Tag, type InputRef } from "antd";
import { CloseOutlined, SearchOutlined } from "@ant-design/icons";
import { api, Bank, errorText, Page, Question } from "@/lib/api";
import { practiceHref } from "@/lib/practice";

export function HeaderSearch() {
  const router = useRouter();
  const client = useQueryClient();
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<InputRef>(null);
  const [value, setValue] = useState("");
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [composing, setComposing] = useState(false);
  const [active, setActive] = useState(-1);
  const stable = !!keyword && keyword === value.trim() && !composing;
  useEffect(() => {
    setActive(-1);
    void client.cancelQueries({ queryKey: ["quick-search"] });
    if (composing) return;
    const timer = setTimeout(() => setKeyword(value.trim()), 350);
    return () => clearTimeout(timer);
  }, [value, composing, client]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
        setExpanded(false);
        void client.cancelQueries({ queryKey: ["quick-search"] });
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [client]);
  const questions = useQuery({
    queryKey: ["quick-search", "questions", keyword],
    queryFn: ({ signal }) =>
      api<Page<Question>>(
        "/question/search/page/vo",
        {
          searchText: keyword,
          current: 1,
          pageSize: 5,
          sortField: "createTime",
          sortOrder: "descend",
        },
        "post",
        signal,
      ),
    enabled: open && stable,
  });
  const banks = useQuery({
    queryKey: ["quick-search", "banks", keyword],
    queryFn: ({ signal }) =>
      api<Page<Bank> | null>(
        "/questionBank/list/page/vo",
        {
          title: keyword,
          current: 1,
          pageSize: 5,
          sortField: "createTime",
          sortOrder: "descend",
        },
        "post",
        signal,
      ),
    enabled: open && stable,
  });
  const questionItems = stable ? questions.data?.records || [] : [];
  const bankItems = stable ? banks.data?.records || [] : [];
  const context = `&q=${encodeURIComponent(keyword)}`;
  const results = [
    ...questionItems.map((item) => ({
      ...item,
      href: practiceHref(item.id, undefined, 1, context),
      kind: "question",
    })),
    ...bankItems.map((item) => ({
      ...item,
      href: `/banks/${item.id}`,
      kind: "bank",
    })),
  ];
  useEffect(() => {
    setActive(-1);
  }, [questions.data, banks.data]);
  function close() {
    setOpen(false);
    setExpanded(false);
    setActive(-1);
    void client.cancelQueries({ queryKey: ["quick-search"] });
  }
  function searchAll() {
    const text = value.trim();
    if (text) {
      close();
      router.push(`/questions?q=${encodeURIComponent(text)}`);
    }
  }
  useEffect(() => {
    if (active >= 0)
      document
        .getElementById(`${panelId}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, panelId]);
  return (
    <div
      className={`header-search ${expanded ? "is-expanded" : ""}`}
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <Button
        className="header-search-toggle"
        type="text"
        icon={<SearchOutlined />}
        aria-label="打开快捷搜索"
        aria-expanded={expanded}
        onClick={() => {
          setExpanded(true);
          setOpen(true);
          requestAnimationFrame(() => input.current?.focus());
        }}
      />
      <div className="header-search-field">
        <Input
          ref={input}
          prefix={<SearchOutlined />}
          allowClear
          placeholder="搜索题目、题库"
          aria-label="快捷搜索题目和题库"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && !!value.trim()}
          aria-controls={open && value.trim() ? panelId : undefined}
          aria-activedescendant={
            open && active >= 0 ? `${panelId}-${active}` : undefined
          }
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onCompositionStart={() => {
            setComposing(true);
            setActive(-1);
          }}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || composing) return;
            if (event.key === "Escape") {
              event.preventDefault();
              close();
              input.current?.blur();
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              if (results.length)
                setActive((index) =>
                  event.key === "ArrowDown"
                    ? (index + 1) % results.length
                    : index <= 0
                      ? results.length - 1
                      : index - 1,
                );
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (open && active >= 0 && results[active]) {
                const href = results[active].href;
                close();
                router.push(href);
              } else searchAll();
            }
          }}
        />
        <Button
          className="header-search-close"
          type="text"
          aria-label="关闭快捷搜索"
          icon={<CloseOutlined />}
          onClick={close}
        />
      </div>
      {open && value.trim() && (
        <div
          className="quick-search-panel"
          id={panelId}
          role="listbox"
          aria-label="快捷搜索结果"
        >
          {!stable ? (
            <div className="quick-search-status">
              <Spin size="small" /> 正在准备搜索…
            </div>
          ) : (
            <>
              <section className="quick-search-group" aria-label="题目结果">
                <div className="quick-search-heading">
                  <strong>题目</strong>
                  <Link
                    href={`/questions?q=${encodeURIComponent(keyword)}`}
                    onClick={close}
                  >
                    查看全部 →
                  </Link>
                </div>
                {questions.isPending ? (
                  <div className="quick-search-status">
                    <Spin size="small" /> 正在查询题目…
                  </div>
                ) : questions.error ? (
                  <div className="quick-search-error">
                    {errorText(questions.error)}{" "}
                    <Button
                      size="small"
                      onClick={() => void questions.refetch()}
                    >
                      重试
                    </Button>
                  </div>
                ) : !questionItems.length ? (
                  <p className="quick-search-status">没有找到相关题目</p>
                ) : (
                  questionItems.map((item, index) => (
                    <Link
                      role="option"
                      aria-selected={active === index}
                      id={`${panelId}-${index}`}
                      className={`quick-search-item ${active === index ? "selected" : ""}`}
                      href={practiceHref(item.id, undefined, 1, context)}
                      key={item.id}
                      onMouseEnter={() => setActive(index)}
                      onClick={close}
                    >
                      <span className="quick-search-title">{item.title}</span>
                      <div>
                        {item.tagList?.slice(0, 3).map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </div>
                    </Link>
                  ))
                )}
              </section>
              <section className="quick-search-group" aria-label="题库结果">
                <div className="quick-search-heading">
                  <strong>题库</strong>
                  <Link
                    href={`/banks?q=${encodeURIComponent(keyword)}`}
                    onClick={close}
                  >
                    查看全部 →
                  </Link>
                </div>
                {banks.isPending ? (
                  <div className="quick-search-status">
                    <Spin size="small" /> 正在查询题库…
                  </div>
                ) : banks.error || banks.data === null ? (
                  <div className="quick-search-error">
                    {banks.error ? errorText(banks.error) : "题库服务暂时降级"}{" "}
                    <Button size="small" onClick={() => void banks.refetch()}>
                      重试
                    </Button>
                  </div>
                ) : !bankItems.length ? (
                  <p className="quick-search-status">没有找到相关题库</p>
                ) : (
                  bankItems.map((item, index) => {
                    const position = questionItems.length + index;
                    return (
                      <Link
                        role="option"
                        aria-selected={active === position}
                        id={`${panelId}-${position}`}
                        className={`quick-search-item ${active === position ? "selected" : ""}`}
                        href={`/banks/${item.id}`}
                        key={item.id}
                        onMouseEnter={() => setActive(position)}
                        onClick={close}
                      >
                        <span className="quick-search-title">{item.title}</span>
                        <p>{item.description || "进入题库，开始刷题"}</p>
                      </Link>
                    );
                  })
                )}
              </section>
            </>
          )}
          <div className="quick-search-hint">
            ↑ ↓ 选择　Enter 跳转　Esc 关闭
          </div>
        </div>
      )}
    </div>
  );
}
