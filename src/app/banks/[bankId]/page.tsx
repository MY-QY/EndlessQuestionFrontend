import { Suspense } from "react";
import { Catalog } from "@/components/learning";
export default function Page({ params }: { params: { bankId: string } }) {
  return (
    <Suspense fallback={<p>加载题库…</p>}>
      <Catalog kind="questions" bankId={params.bankId} />
    </Suspense>
  );
}
