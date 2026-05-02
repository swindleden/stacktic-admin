import Link from "next/link";

/**
 * Renders a page picker as anchor tags. Server-side: takes total + pageSize +
 * current page, plus a function that produces hrefs (so we don't couple the
 * component to a specific URL shape).
 *
 * Numeric window is fixed at 5 pages with sensible ellipses — matches the
 * mockup's "Prev 1 2 3 … 6 Next" pattern when there are enough pages.
 */
export function Pagination({
  page,
  pageSize,
  total,
  hrefForPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefForPage: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border-soft text-xs text-muted">
      <div>
        Showing {start.toLocaleString()}–{end.toLocaleString()} of{" "}
        {total.toLocaleString()}
      </div>
      <div className="flex items-center gap-1">
        <PageBtn href={hrefForPage(page - 1)} disabled={page <= 1}>
          Prev
        </PageBtn>
        {pageWindow(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span
              key={`gap-${i}`}
              className="px-2 py-1 stk-mono text-muted-light"
            >
              …
            </span>
          ) : (
            <PageBtn
              key={p}
              href={hrefForPage(p)}
              active={p === page}
            >
              {p}
            </PageBtn>
          ),
        )}
        <PageBtn
          href={hrefForPage(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </PageBtn>
      </div>
    </div>
  );
}

function PageBtn({
  href,
  children,
  active,
  disabled,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  const className = [
    "px-2 py-1 border rounded transition-colors",
    active
      ? "border-navy bg-navy text-white"
      : disabled
        ? "border-border-soft text-muted-light cursor-not-allowed"
        : "border-border text-slate hover:bg-bg-warm",
  ].join(" ");

  if (disabled) return <span className={className}>{children}</span>;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function pageWindow(page: number, total: number): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: Array<number | "…"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}
