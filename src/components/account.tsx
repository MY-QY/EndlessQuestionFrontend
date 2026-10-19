"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  App,
  Avatar,
  Button,
  Form,
  Input,
  Skeleton,
  Upload,
} from "antd";
import { UserOutlined, CheckOutlined, UploadOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api, errorText, User } from "@/lib/api";
import { useAuth } from "./providers";
import { Failure } from "./learning";
import { SignCalendar } from "./sign-calendar";
export function Guard({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const { user, loading } = useAuth();
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user)
      router.replace(`/user/login?returnUrl=${encodeURIComponent(path)}`);
  }, [loading, user, router, path]);
  if (loading || !user) return <Skeleton active />;
  if (admin && user.userRole !== "admin")
    return (
      <div className="panel">
        <h1>暂无访问权限</h1>
        <p>此页面仅对管理员开放。</p>
        <Link href="/">返回首页</Link>
      </div>
    );
  return <>{children}</>;
}
export function AuthPage({ register = false }: { register?: boolean }) {
  const { message } = App.useApp();
  const client = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requested = params.get("returnUrl") || "/";
  const destination =
    requested.startsWith("/") &&
    !requested.startsWith("//") &&
    !requested.includes("\\") &&
    !requested.startsWith("/user/login") &&
    !requested.startsWith("/user/register")
      ? requested
      : "/";
  async function submit(values: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      if (register) {
        await api("/user/register", values);
        message.success("注册成功，请登录");
        router.push(`/user/login?returnUrl=${encodeURIComponent(destination)}`);
      } else {
        const user = await api<User>("/user/login", values);
        client.setQueryData(["user"], user);
        router.replace(destination);
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-intro">
        <span className="eyebrow">WELCOME TO 题海无涯</span>
        <h1>
          你的下一次突破，
          <br />
          从这里开始。
        </h1>
        <p>
          把好奇变成行动，把积累变成力量。
          <br />
          每一道题，都值得认真思考。
        </p>
        <div className="auth-decoration">∞</div>
      </div>
      <section className="panel auth-card">
        <h2>{register ? "创建账号" : "欢迎回来"}</h2>
        <p className="muted">
          {register ? "开启你的知识探索之旅" : "登录题海无涯，继续今天的学习"}
        </p>
        {error && <Alert type="error" message={error} showIcon />}
        <Form layout="vertical" onFinish={submit}>
          <Form.Item
            name="userAccount"
            label="账号"
            rules={[
              { required: true, message: "请输入账号" },
              { min: 4, message: "账号至少 4 位" },
            ]}
          >
            <Input
              autoComplete="username"
              placeholder="至少 4 位字符"
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="userPassword"
            label="密码"
            rules={[
              { required: true, message: "请输入密码" },
              { min: 8, message: "密码至少 8 位" },
            ]}
          >
            <Input.Password
              autoComplete={register ? "new-password" : "current-password"}
              placeholder="至少 8 位字符"
              size="large"
            />
          </Form.Item>
          {register && (
            <Form.Item
              name="checkPassword"
              label="确认密码"
              dependencies={["userPassword"]}
              rules={[
                { required: true, message: "请再次输入密码" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    return !value || value === getFieldValue("userPassword")
                      ? Promise.resolve()
                      : Promise.reject(new Error("两次密码不一致"));
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" size="large" />
            </Form.Item>
          )}
          <Button
            type="primary"
            htmlType="submit"
            loading={busy}
            block
            size="large"
          >
            {register ? "注册" : "登录"}
          </Button>
        </Form>
        <p className="auth-switch">
          {register ? "已有账号？" : "还没有账号？"}
          <Link
            href={`/user/${register ? "login" : "register"}?returnUrl=${encodeURIComponent(destination)}`}
          >
            {register ? "立即登录" : "创建账号"}
          </Link>
        </p>
      </section>
    </div>
  );
}
export function ProfilePage() {
  return (
    <Guard>
      <ProfileContent />
    </Guard>
  );
}
function ProfileContent() {
  const { user, refresh } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [month, setMonth] = useState(() => dayjs().startOf("month"));
  const year = month.year();
  const currentYear = dayjs().year();
  const avatar = Form.useWatch("userAvatar", form);
  useEffect(() => {
    if (user)
      form.setFieldsValue({
        userName: user.userName,
        userProfile: user.userProfile,
        userAvatar: user.userAvatar,
      });
  }, [user, form]);
  const sign = useQuery({
    queryKey: ["private", "sign", user?.id, year],
    queryFn: ({ signal }) =>
      api<number[]>("/user/get/sign_in", { year }, "get", signal),
    enabled: !!user,
  });
  const currentSign = useQuery({
    queryKey: ["private", "sign", user?.id, currentYear],
    queryFn: ({ signal }) =>
      api<number[]>("/user/get/sign_in", { year: currentYear }, "get", signal),
    enabled: !!user,
  });
  const client = useQueryClient();
  const today = dayjs().diff(dayjs().startOf("year"), "day") + 1;
  const signedToday = (currentSign.data || []).includes(today);
  async function save(values: Record<string, string>) {
    setSaving(true);
    try {
      await api("/user/update/my", values);
      await refresh();
      message.success("个人资料已保存");
    } catch (e) {
      message.error(errorText(e));
    } finally {
      setSaving(false);
    }
  }
  async function signIn() {
    setSigning(true);
    try {
      await api("/user/add/sign_in");
      await client.invalidateQueries({
        queryKey: ["private", "sign", user?.id, currentYear],
        exact: true,
      });
      setMonth(dayjs().startOf("month"));
      message.success("今日签到成功");
    } catch (e) {
      message.error(errorText(e));
    } finally {
      setSigning(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">YOUR LEARNING SPACE</span>
        <h1>你好，{user?.userName || "学习者"}。</h1>
        <p>让每一天的小小坚持，都留下印记。</p>
      </div>
      <div className="profile-grid">
        <section className="panel">
          <h2>个人资料</h2>
          <Form form={form} layout="vertical" onFinish={save}>
            <div className="avatar-editor">
              <Avatar size={72} src={avatar} icon={<UserOutlined />} />
              <Upload
                showUploadList={false}
                accept=".jpg,.jpeg,.png,.webp,.svg"
                beforeUpload={(file) => {
                  if (
                    file.size > 1024 * 1024 ||
                    !/\.(jpe?g|png|webp|svg)$/.test(file.name)
                  ) {
                    message.error(
                      "请选择不超过 1 MB 的 jpg、png、webp 或 svg 图片",
                    );
                    return Upload.LIST_IGNORE;
                  }
                  return true;
                }}
                customRequest={async (options) => {
                  setUploading(true);
                  try {
                    const data = new FormData();
                    data.append("file", options.file);
                    data.append("biz", "user_avatar");
                    const url = await api<string>("/file/upload", data);
                    form.setFieldValue("userAvatar", url);
                    options.onSuccess?.(url);
                    message.success("上传成功，保存资料后生效");
                  } catch (e) {
                    message.error(errorText(e));
                    options.onError?.(new Error(errorText(e)));
                  } finally {
                    setUploading(false);
                  }
                }}
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  上传头像
                </Button>
              </Upload>
            </div>
            <Form.Item name="userAvatar" hidden>
              <Input />
            </Form.Item>
            <Form.Item
              label="昵称"
              name="userName"
              rules={[
                { required: true, message: "请输入昵称" },
                { max: 32, message: "最多 32 个字符" },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="个人简介"
              name="userProfile"
              rules={[{ max: 500, message: "最多 500 个字符" }]}
            >
              <Input.TextArea rows={4} showCount maxLength={500} />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              disabled={uploading}
            >
              保存资料
            </Button>
          </Form>
        </section>
        <section className="panel">
          <div className="section-heading compact">
            <h2>学习签到</h2>
            <Button
              type="primary"
              loading={signing}
              disabled={
                signedToday || currentSign.isPending || !!currentSign.error
              }
              icon={signedToday ? <CheckOutlined /> : undefined}
              onClick={signIn}
            >
              {signedToday ? "今日已签到" : "今日签到"}
            </Button>
          </div>
          <p className="muted">每月一页，记录每一天的坚持。</p>
          {currentSign.error && year !== currentYear && (
            <Failure
              error={currentSign.error}
              retry={() => void currentSign.refetch()}
            />
          )}
          <SignCalendar
            month={month}
            records={sign.data || []}
            onChange={setMonth}
            status={
              sign.isPending ? (
                <Skeleton active />
              ) : sign.error ? (
                <Failure error={sign.error} retry={() => void sign.refetch()} />
              ) : undefined
            }
          />
        </section>
      </div>
    </>
  );
}
