"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { App, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, User } from "@/lib/api";
import { clearAuthState } from "@/lib/auth";
const AuthContext = createContext<{
  user?: User;
  loading: boolean;
  refresh: () => Promise<unknown>;
  clearAuth: () => Promise<void>;
}>({ loading: true, refresh: async () => {}, clearAuth: async () => {} });
export const useAuth = () => useContext(AuthContext);
function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["user"],
    queryFn: ({ signal }) => api<User>("/user/get/login", {}, "get", signal),
    retry: false,
  });
  const clearAuth = useCallback(() => clearAuthState(client), [client]);
  useEffect(() => {
    const expire = () => {
      void clearAuth();
    };
    window.addEventListener("auth-expired", expire);
    return () => window.removeEventListener("auth-expired", expire);
  }, [clearAuth]);
  return (
    <AuthContext.Provider
      value={{
        user: query.data || undefined,
        loading: query.isPending,
        refresh: query.refetch,
        clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 60000,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: "#2258d5",
            borderRadius: 10,
            fontFamily: "Inter, PingFang SC, Microsoft YaHei, sans-serif",
          },
        }}
      >
        <App>
          <AuthProvider>{children}</AuthProvider>
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
