import Link from "next/link";

/**
 * Server-side pagination — anchor-based for SSR. Visual chrome matches the
 * Backstage Pagination primitive (mono Prev/Next, inverse-fill on the active
 * page, ellipses with mono dots).
 *
 * Sizes the page window at 5 with sensible ellipses so the row doesn't
 * jump as the user moves through pages.
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
    <div className="flex items-center justify-between gap-3 font-mono text-[11.5px] text-muted tracking-[0.02em]">
      <div>
        Showing {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}
      </div>
      <div className="flex items-center gap-1.5">
        <PageBtn href={hrefForPage(page - 1)} disabled={page <= 1}>Prev</PageBtn>
        {pageWindow(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="text-muted-2 px-0.5">…</span>
          ) : (
            <PageBtn key={p} href={hrefForPage(p)} active={p === page}>{p}</PageBtn>
          ),
        )}
        <PageBtn href={hrefForPage(page + 1)} disabled={page >= totalPages}>Next</PageBtn>
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
    "px-2.5 py-1 border rounded-sm font-mono text-[11px]",
    active
      ? "bg-ink text-paper border-ink"
      : disabled
        ? "bg-paper-4 border-line text-muted-2 opacity-50 cursor-not-allowed"
        : "bg-paper-4 border-line text-muted hover:text-ink cursor-pointer",
  ].join(" ");

  if (disabled || active) return <span className={className}>{children}</span>;
  return (
    <Link href={href as never} className={className}>
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
