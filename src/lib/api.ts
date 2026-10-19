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

function rejectResponse(url: string, code: number, message: string): never {
  if (typeof window !== "undefined") {
    if (code === 110) {
      try {
        sessionStorage.setItem("thyw-cooldown", String(Date.now() + 60000));
      } catch {}
    }
    if (code === 40100 && url !== "/user/get/login")
      window.dispatchEvent(new Event("auth-expired"));
  }
  throw new ApiError(code, message);
}

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
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) throw new DOMException("请求已取消", "AbortError");
  signal?.addEventListener("abort", cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15000);
  try {
    let address = `/api${url}`;
    if (method === "get" && data) {
      const params = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        (Array.isArray(value) ? value : [value]).forEach((item) =>
          params.append(
            key,
            typeof item === "object" ? JSON.stringify(item) : String(item),
          ),
        );
      });
      if (params.size)
        address += `${address.includes("?") ? "&" : "?"}${params}`;
    }
    const multipart =
      typeof FormData !== "undefined" && data instanceof FormData;
    const response = await fetch(address, {
      method: method.toUpperCase(),
      credentials: "include",
      signal: controller.signal,
      cache: "no-store",
      ...(method === "post"
        ? {
            body: multipart
              ? data
              : data === undefined
                ? undefined
                : JSON.stringify(data),
            ...(multipart
              ? {}
              : { headers: { "Content-Type": "application/json" } }),
          }
        : {}),
    });
    let body: { code?: number; data?: T; message?: string } | null = null;
    try {
      body = await response.json();
    } catch {
      if (response.ok) throw new ApiError(-1, "服务返回了无法识别的数据");
    }
    if (!response.ok) {
      const codes: Record<number, [number, string]> = {
        401: [40100, "登录已过期，请重新登录"],
        403: [40101, "暂无访问权限"],
        404: [40400, "请求的内容不存在"],
      };
      const [code, message] = codes[response.status] || [
        50000,
        `服务请求失败（${response.status}），请稍后重试`,
      ];
      rejectResponse(
        url,
        typeof body?.code === "number" && body.code !== 0 ? body.code : code,
        body?.message || message,
      );
    }
    if (!body || typeof body.code !== "number")
      throw new ApiError(-1, "服务返回了无法识别的数据");
    if (body.code !== 0)
      rejectResponse(url, body.code, body.message || "操作失败");
    return body.data as T;
  } catch (error) {
    if (signal?.aborted) throw new DOMException("请求已取消", "AbortError");
    if (timedOut) throw new Error("请求超时，请稍后重试");
    if (error instanceof ApiError) throw error;
    throw new Error("无法连接服务，请检查后端是否启动");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

export const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "操作失败，请重试";
