export function practiceHref(
  id: string,
  bankId?: string,
  page = 1,
  context = "",
) {
  const base = bankId
    ? `/banks/${encodeURIComponent(bankId)}/questions`
    : "/questions";
  const current = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const params = new URLSearchParams(`page=${current}${context}`);
  params.delete("mode");
  params.set("page", String(current));
  return `${base}/${encodeURIComponent(id)}?${params}`;
}
