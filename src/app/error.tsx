"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="panel empty-page">
      <h1>页面加载遇到了问题</h1>
      <p>请重试，或稍后再回来。</p>
      <button onClick={reset}>重新加载</button>
    </div>
  );
}
