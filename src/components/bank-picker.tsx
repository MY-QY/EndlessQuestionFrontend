"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Empty, Select, Spin } from "antd";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api, Bank, errorText, Page } from "@/lib/api";

export interface BankSelection {
  value: string;
  label: string;
}
export function BankPicker({
  value = [],
  onChange,
  disabled,
  id,
  ariaLabel = "添加到题库",
}: {
  value?: BankSelection[];
  onChange?: (value: BankSelection[]) => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}) {
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useInfiniteQuery({
    queryKey: ["private", "bank-picker", keyword],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api<Page<Bank>>(
        "/questionBank/list/page",
        {
          title: keyword,
          current: pageParam,
          pageSize: 20,
          sortField: "createTime",
          sortOrder: "descend",
        },
        "post",
        signal,
      ),
    getNextPageParam: (last, pages) =>
      pages.length * 20 < Number(last.total) ? pages.length + 1 : undefined,
  });
  const banks =
    search.trim() === keyword
      ? query.data?.pages.flatMap((page) => page.records) || []
      : [];
  const options = Array.from(
    new Map(
      banks.map((bank) => [bank.id, { value: bank.id, label: bank.title }]),
    ).values(),
  );
  return (
    <Select
      id={id}
      aria-label={ariaLabel}
      mode="multiple"
      labelInValue
      showSearch
      filterOption={false}
      value={value}
      onChange={onChange}
      disabled={disabled}
      loading={query.isFetching}
      placeholder="搜索并选择题库，可多选"
      onSearch={setSearch}
      searchValue={search}
      autoClearSearchValue={false}
      options={options}
      onPopupScroll={(event) => {
        const target = event.currentTarget;
        if (
          target.scrollHeight - target.scrollTop - target.clientHeight < 40 &&
          query.hasNextPage &&
          search.trim() === keyword &&
          !query.isFetching
        )
          void query.fetchNextPage();
      }}
      notFoundContent={
        query.isPending || search.trim() !== keyword ? (
          <Spin size="small" />
        ) : query.error ? (
          <span>
            {errorText(query.error)}{" "}
            <Button size="small" onClick={() => void query.refetch()}>
              重试
            </Button>
          </span>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                未找到题库，
                <Link
                  href="/admin/banks"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  前往题库管理
                </Link>
              </span>
            }
          />
        )
      }
      popupRender={(menu) => (
        <>
          {menu}
          <div className="bank-picker-footer">
            {query.error && banks.length > 0 ? (
              <>
                <span>{errorText(query.error)}</span>
                <Button size="small" onClick={() => void query.refetch()}>
                  重试
                </Button>
              </>
            ) : query.hasNextPage ? (
              <Button
                type="link"
                size="small"
                loading={query.isFetchingNextPage}
                disabled={query.isFetching || search.trim() !== keyword}
                onClick={() => void query.fetchNextPage()}
              >
                加载更多题库
              </Button>
            ) : (
              <span>已加载 {banks.length} 个题库</span>
            )}
          </div>
        </>
      )}
    />
  );
}
