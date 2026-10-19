"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { App, Avatar, Button, Dropdown, Space } from "antd";
import { ReadOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "./providers";
import { api, ApiError, errorText } from "@/lib/api";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, loading, clearAuth } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutPending = useRef(false);
  const { message } = App.useApp();
  async function logout() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setLoggingOut(true);
    try {
      try {
        await api("/user/logout");
      } catch (e) {
        if (!(e instanceof ApiError && e.code === 40100)) throw e;
      }
      await clearAuth();
      router.replace("/");
    } catch (e) {
      message.error(errorText(e));
    } finally {
      logoutPending.current = false;
      setLoggingOut(false);
    }
  }
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/">
            <span className="brand-icon">
              <ReadOutlined />
            </span>
            题海无涯<span className="brand-caption">保持好奇，持续进步</span>
          </Link>
          <nav>
            {[
              ["/", "首页"],
              ["/banks", "题库"],
              ["/questions", "题目"],
            ].map(([href, label]) => (
              <Link
                key={href}
                className={
                  (href === "/" ? path === "/" : path.startsWith(href))
                    ? "active"
                    : ""
                }
                href={href}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="account">
            {loading ? (
              <span className="muted">加载中</span>
            ) : user ? (
              <Dropdown
                disabled={loggingOut}
                menu={{
                  items: [
                    { key: "profile", label: "个人中心" },
                    ...(user.userRole === "admin"
                      ? [{ key: "admin", label: "管理后台" }]
                      : []),
                    {
                      key: "logout",
                      label: loggingOut ? "退出中…" : "退出登录",
                      danger: true,
                      disabled: loggingOut,
                    },
                  ],
                  onClick: ({ key }) =>
                    key === "logout"
                      ? void logout()
                      : router.push(
                          key === "profile"
                            ? "/user/profile"
                            : "/admin/questions",
                        ),
                }}
              >
                <Space className="user-menu">
                  <Avatar
                    size="small"
                    src={user.userAvatar}
                    icon={<UserOutlined />}
                  />
                  <span>
                    {loggingOut ? "退出中…" : user.userName || "学习者"}
                  </span>
                </Space>
              </Dropdown>
            ) : (
              <Link href="/user/login">
                <Button type="primary">登录 / 注册</Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="main-container">{children}</main>
      <footer className="site-footer">
        <strong>题海无涯</strong>
        <span>每一次思考，都是向前一步。</span>
        <span>学无止境 · 行而不辍</span>
      </footer>
    </>
  );
}
