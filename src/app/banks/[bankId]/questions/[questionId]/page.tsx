import { Suspense } from "react";
import { QuestionDetail } from "@/components/learning";
export default function Page({
  params,
}: {
  params: { bankId: string; questionId: string };
}) {
  return (
    <Suspense fallback={<p>加载题目…</p>}>
      <QuestionDetail id={params.questionId} bankId={params.bankId} />
    </Suspense>
  );
}
