import Link from "next/link";
export default function Page() {
  return (
    <div className="panel empty-page">
      <h1>暂无访问权限</h1>
      <p>当前账号无法访问此内容。</p>
      <Link href="/">返回首页 →</Link>
    </div>
  );
}
