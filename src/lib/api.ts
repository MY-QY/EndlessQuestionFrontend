import axios from "axios";
export interface User {
  id: string;
  userAccount?: string;
  userName?: string;
  userAvatar?: string;
  userProfile?: string;
  userRole: string;
}
export interface Question {
  id: string;
  title: string;
  content?: string;
  answer?: string;
  tagList?: string[];
  tags?: string;
  user?: User;
  userId?: string;
  createTime?: string;
}
export interface Bank {
  id: string;
  title: string;
  description?: string;
  picture?: string;
  user?: User;
}
export interface Page<T> {
  records: T[];
  total: string | number;
  current: string | number;
}
export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
  }
}
export const http = axios.create({
  baseURL: "/api",
  timeout: 15000,
  withCredentials: true,
});
http.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (!body || typeof body.code !== "number")
      return Promise.reject(new ApiError(-1, "服务返回了无法识别的数据"));
    if (body.code !== 0) {
      if (body.code === 110 && typeof window !== "undefined") {
        try {
          sessionStorage.setItem("thyw-cooldown", String(Date.now() + 60000));
        } catch {}
      }
      if (
        body.code === 40100 &&
        typeof window !== "undefined" &&
        !response.config.url?.includes("/user/get/login")
      )
        window.dispatchEvent(new Event("auth-expired"));
      return Promise.reject(
        new ApiError(body.code, body.message || "操作失败"),
      );
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    if (status === 401 && typeof window !== "undefined")
      window.dispatchEvent(new Event("auth-expired"));
    if (error.response?.data?.code)
      return Promise.reject(
        new ApiError(
          error.response.data.code,
          error.response.data.message || "操作失败",
        ),
      );
    if (status === 401)
      return Promise.reject(new ApiError(40100, "登录已过期，请重新登录"));
    if (status === 403)
      return Promise.reject(new ApiError(40101, "暂无访问权限"));
    if (status === 404)
      return Promise.reject(new ApiError(40400, "请求的内容不存在"));
    return Promise.reject(
      new Error(
        axios.isCancel(error)
          ? "请求已取消"
          : error.code === "ECONNABORTED"
            ? "请求超时，请稍后重试"
            : "无法连接服务，请检查后端是否启动",
      ),
    );
  },
);
export async function api<T>(
  url: string,
  data?: unknown,
  method: "get" | "post" = "post",
  signal?: AbortSignal,
): Promise<T> {
  if (url === "/question/get/vo" && typeof window !== "undefined") {
    let until = 0;
    try {
      until = Number(sessionStorage.getItem("thyw-cooldown") || 0);
    } catch {}
    if (until > Date.now())
      throw new ApiError(
        110,
        `访问较频繁，请 ${Math.ceil((until - Date.now()) / 1000)} 秒后再试`,
      );
  }
  const response = await http.request<{ data: T }>({
    url,
    method,
    ...(method === "get" ? { params: data } : { data }),
    signal,
  });
  return response.data.data;
}
export const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "操作失败，请重试";
