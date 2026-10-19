import { Suspense } from "react";
import { Catalog } from "@/components/learning";
export default function Page() {
  return (
    <Suspense fallback={<p>加载题库…</p>}>
      <Catalog kind="banks" />
    </Suspense>
  );
}
