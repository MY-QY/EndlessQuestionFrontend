import { AdminPage } from "@/components/admin";
export default function Page({ params }: { params: { bankId: string } }) {
  return <AdminPage kind="questions" bankId={params.bankId} />;
}
