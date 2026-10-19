import Link from "next/link";
export default function NotFound() {
  return (
    <div className="panel empty-page">
      <span className="eyebrow">404 / LOST AT SEA</span>
      <h1>这一页，暂时没有答案。</h1>
      <p>内容可能已被移除，换个方向继续探索吧。</p>
      <Link href="/">返回首页 →</Link>
    </div>
  );
}
