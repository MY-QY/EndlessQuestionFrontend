"use client";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  App,
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Bank, errorText, Page, Question, User } from "@/lib/api";
import { Guard } from "./account";
import { Failure } from "./learning";
const Editor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => <p>正在加载编辑器…</p>,
});
type RecordItem = Question & Bank & User;
const resources = {
  questions: { endpoint: "question", title: "题目管理" },
  banks: { endpoint: "questionBank", title: "题库管理" },
  users: { endpoint: "user", title: "用户管理" },
};
export function AdminPage({
  kind,
  bankId,
}: {
  kind: keyof typeof resources;
  bankId?: string;
}) {
  return (
    <Guard admin>
      <AdminContent kind={kind} bankId={bankId} />
    </Guard>
  );
}
function AdminContent({
  kind,
  bankId,
}: {
  kind: keyof typeof resources;
  bankId?: string;
}) {
  const config = resources[kind];
  const { message } = App.useApp();
  const client = useQueryClient();
  const [current, setCurrent] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<React.Key[]>([]);
  const [editing, setEditing] = useState<Partial<RecordItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [operating, setOperating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form] = Form.useForm();
  const query = useQuery({
    queryKey: ["private", "admin", kind, bankId, current, keyword],
    queryFn: ({ signal }) =>
      api<Page<RecordItem>>(
        `/${config.endpoint}/list/page`,
        {
          current,
          pageSize: 20,
          ...(kind === "users" ? { userName: keyword } : { title: keyword }),
          ...(bankId ? { questionBankId: bankId } : {}),
          sortField: "createTime",
          sortOrder: "descend",
        },
        "post",
        signal,
      ),
  });
  async function invalidate() {
    await client.invalidateQueries({
      predicate: (q) => q.queryKey[0] !== "user",
    });
    setSelected([]);
  }
  function edit(item: Partial<RecordItem>) {
    setEditing(item);
    form.resetFields();
    form.setFieldsValue({
      ...item,
      tags:
        item.tagList ||
        (() => {
          try {
            return JSON.parse(item.tags || "[]");
          } catch {
            return [];
          }
        })(),
    });
  }
  async function save(values: Record<string, unknown>) {
    setSaving(true);
    try {
      await api(`/${config.endpoint}/${editing?.id ? "update" : "add"}`, {
        ...values,
        ...(editing?.id ? { id: editing.id } : {}),
      });
      message.success("保存成功");
      setEditing(null);
      await invalidate();
      if (kind === "users")
        await client.invalidateQueries({ queryKey: ["user"] });
    } catch (e) {
      message.error(errorText(e));
    } finally {
      setSaving(false);
    }
  }
  async function remove(ids: React.Key[]) {
    setOperating(true);
    try {
      if (bankId)
        await api("/questionBankQuestion/remove/batch", {
          questionBankId: bankId,
          questionIdList: ids,
        });
      else if (kind === "questions" && ids.length > 1)
        await api("/question/delete/batch", { questionIdList: ids });
      else await api(`/${config.endpoint}/delete`, { id: String(ids[0]) });
      message.success(bankId ? "已移除关联，题目本身保留" : "删除成功");
      if (current > 1 && ids.length >= (query.data?.records.length || 0))
        setCurrent(current - 1);
      await invalidate();
      if (kind === "users")
        await client.invalidateQueries({ queryKey: ["user"] });
    } catch (e) {
      message.error(errorText(e));
    } finally {
      setOperating(false);
    }
  }
  const columns = [
    { title: "ID", dataIndex: "id", width: 175 },
    {
      title: kind === "users" ? "昵称" : "标题",
      dataIndex: kind === "users" ? "userName" : "title",
      render: (value: string, row: RecordItem) =>
        kind === "questions" ? (
          <Link href={`/questions/${row.id}`}>{value}</Link>
        ) : (
          value || "未设置"
        ),
    },
    ...(kind === "users"
      ? [
          { title: "账号", dataIndex: "userAccount" },
          {
            title: "角色",
            dataIndex: "userRole",
            render: (role: string) => (
              <Tag
                color={
                  role === "admin" ? "blue" : role === "ban" ? "red" : "default"
                }
              >
                {role === "admin"
                  ? "管理员"
                  : role === "ban"
                    ? "已封禁"
                    : "普通用户"}
              </Tag>
            ),
          },
        ]
      : [
          {
            title: "创建时间",
            dataIndex: "createTime",
            render: (value: string) => value?.slice(0, 10) || "—",
          },
        ]),
    {
      title: "操作",
      key: "actions",
      width: kind === "banks" ? 250 : 180,
      render: (_: unknown, row: RecordItem) => (
        <Space wrap>
          {!bankId && (
            <Button size="small" onClick={() => edit(row)}>
              编辑
            </Button>
          )}
          {kind === "banks" && (
            <Link href={`/admin/banks/${row.id}/questions`}>题目关联</Link>
          )}
          <Popconfirm
            title={
              bankId ? "仅移除该题目的题库关联？" : "确定删除？此操作不可撤销。"
            }
            onConfirm={() => remove([row.id])}
          >
            <Button danger size="small" disabled={operating}>
              {bankId ? "移除" : "删除"}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">WORKSPACE / ADMINISTRATION</span>
        <h1>{bankId ? "题库题目关联管理" : config.title}</h1>
        <p>
          {bankId
            ? "管理当前题库的题目目录，移除操作不会删除原始题目。"
            : "认真整理每一份内容，让知识更有条理。"}
        </p>
      </div>
      <nav className="admin-tabs">
        {Object.entries(resources).map(([key, value]) => (
          <Link
            className={key === kind ? "selected" : ""}
            key={key}
            href={`/admin/${key}`}
          >
            {value.title}
          </Link>
        ))}
        {bankId && <Link href={`/banks/${bankId}`}>查看题库 ↗</Link>}
      </nav>
      <section className="panel">
        <div className="table-toolbar">
          <Input.Search
            allowClear
            placeholder={kind === "users" ? "搜索昵称" : "搜索标题"}
            onSearch={(value) => {
              setKeyword(value);
              setCurrent(1);
              setSelected([]);
            }}
          />
          <Space wrap>
            {kind === "questions" && (
              <Popconfirm
                title={`确定${bankId ? "移除关联" : "删除"}选中的 ${selected.length} 道题目？`}
                onConfirm={() => remove(selected)}
              >
                <Button
                  danger
                  disabled={!selected.length || operating}
                  loading={operating}
                  icon={<DeleteOutlined />}
                >
                  批量{bankId ? "移除" : "删除"}
                </Button>
              </Popconfirm>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => (bankId ? setAdding(true) : edit({}))}
            >
              {bankId ? "添加题目" : "新建"}
            </Button>
          </Space>
        </div>
        {query.error && (
          <Failure error={query.error} retry={() => void query.refetch()} />
        )}
        <Table<RecordItem>
          rowKey="id"
          columns={columns}
          dataSource={query.data?.records || []}
          loading={query.isPending}
          scroll={{ x: 800 }}
          rowSelection={
            kind === "questions"
              ? {
                  selectedRowKeys: selected,
                  onChange: setSelected,
                  getCheckboxProps: () => ({ disabled: operating }),
                }
              : undefined
          }
          pagination={{
            current,
            pageSize: 20,
            total: Number(query.data?.total || 0),
            showSizeChanger: false,
            onChange: (page) => {
              setCurrent(page);
              setSelected([]);
            },
          }}
        />
      </section>
      <Drawer
        title={`${editing?.id ? "编辑" : "新建"}${kind === "users" ? "用户" : kind === "banks" ? "题库" : "题目"}`}
        open={editing !== null}
        onClose={() => !saving && setEditing(null)}
        width={kind === "questions" ? 860 : 520}
        maskClosable={!saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={save} disabled={saving}>
          {kind === "users" ? (
            <>
              {!editing?.id && (
                <>
                  <Alert
                    type="info"
                    message="新建用户的初始密码由后端设置为 12345678"
                  />
                  <Form.Item
                    name="userAccount"
                    label="账号"
                    rules={[{ required: true }, { min: 4 }]}
                  >
                    <Input />
                  </Form.Item>
                </>
              )}
              <Form.Item
                name="userName"
                label="昵称"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="userRole"
                label="角色"
                initialValue="user"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: "user", label: "普通用户" },
                    { value: "admin", label: "管理员" },
                    ...(editing?.id ? [{ value: "ban", label: "封禁" }] : []),
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="userAvatar"
                label="头像 URL"
                rules={[{ type: "url" }]}
              >
                <Input />
              </Form.Item>
              {editing?.id && (
                <Form.Item name="userProfile" label="简介">
                  <Input.TextArea rows={3} />
                </Form.Item>
              )}
            </>
          ) : (
            <>
              <Form.Item
                name="title"
                label="标题"
                rules={[{ required: true }, { max: 80 }]}
              >
                <Input />
              </Form.Item>
              {kind === "banks" ? (
                <>
                  <Form.Item name="description" label="介绍">
                    <Input.TextArea rows={5} />
                  </Form.Item>
                  <Form.Item
                    name="picture"
                    label="封面 URL"
                    rules={[{ type: "url" }]}
                  >
                    <Input placeholder="https://…" />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item name="tags" label="标签">
                    <Select
                      mode="tags"
                      tokenSeparators={[",", "，"]}
                      placeholder="输入标签后按回车"
                    />
                  </Form.Item>
                  <div data-color-mode="light">
                    <Form.Item
                      name="content"
                      label="题干"
                      rules={[{ required: true, message: "请输入题干" }]}
                    >
                      {/* Drawer owns the page scroll lock; the editor must not copy it to body. */}
                      <Editor height={250} overflow={false} />
                    </Form.Item>
                    <Form.Item name="answer" label="参考答案">
                      <Editor height={250} overflow={false} />
                    </Form.Item>
                  </div>
                </>
              )}
            </>
          )}
          <Button type="primary" htmlType="submit" loading={saving}>
            保存
          </Button>
        </Form>
      </Drawer>
      {bankId && (
        <AddQuestions
          bankId={bankId}
          open={adding}
          close={() => setAdding(false)}
          done={invalidate}
        />
      )}
    </>
  );
}
function AddQuestions({
  bankId,
  open,
  close,
  done,
}: {
  bankId: string;
  open: boolean;
  close: () => void;
  done: () => Promise<void>;
}) {
  const [current, setCurrent] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<React.Key[]>([]);
  const [busy, setBusy] = useState(false);
  const { message } = App.useApp();
  const query = useQuery({
    queryKey: ["private", "pick-questions", current, keyword],
    queryFn: ({ signal }) =>
      api<Page<Question>>(
        "/question/list/page",
        { current, pageSize: 20, title: keyword },
        "post",
        signal,
      ),
    enabled: open,
  });
  async function add() {
    setBusy(true);
    try {
      await api("/questionBankQuestion/add/batch", {
        questionBankId: bankId,
        questionIdList: selected,
      });
      message.success("题目已添加，已存在的关联由后端处理");
      await done();
      setSelected([]);
      close();
    } catch (e) {
      message.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Drawer
      title="选择要加入题库的题目"
      width={760}
      open={open}
      onClose={() => !busy && close()}
      extra={
        <Button
          type="primary"
          disabled={!selected.length}
          loading={busy}
          onClick={add}
        >
          添加 {selected.length ? `(${selected.length})` : ""}
        </Button>
      }
    >
      <Input.Search
        placeholder="搜索题目标题"
        onSearch={(value) => {
          setKeyword(value);
          setCurrent(1);
          setSelected([]);
        }}
      />
      {query.error && (
        <Failure error={query.error} retry={() => void query.refetch()} />
      )}
      <Table<Question>
        rowKey="id"
        loading={query.isPending}
        dataSource={query.data?.records || []}
        columns={[{ title: "标题", dataIndex: "title" }]}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: setSelected,
          preserveSelectedRowKeys: true,
          getCheckboxProps: () => ({ disabled: busy }),
        }}
        pagination={{
          current,
          pageSize: 20,
          total: Number(query.data?.total || 0),
          showSizeChanger: false,
          onChange: setCurrent,
        }}
      />
    </Drawer>
  );
}
