import { Suspense } from "react";
import { AuthPage } from "@/components/account";
export default function Page() {
  return (
    <Suspense fallback={<p>加载中…</p>}>
      <AuthPage />
    </Suspense>
  );
}
