import type { ReactNode } from "react";

/**
 * The bordered, rounded card every data table sits inside. Owns the chrome
 * (border / shadow / overflow clipping) so individual pages don't have to
 * repeat the wrapper. Also takes an optional `footer` slot — we put
 * Pagination there.
 *
 * Th/ThNum/Td/TdNum are exported alongside so callers can compose a real
 * <table> without re-deriving the typography classes every time.
 */
export function TableCard({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="bg-surface border border-border rounded-md overflow-hidden shadow-stk-sm">
      {children}
      {footer ? footer : null}
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th className="text-left px-4 py-2 stk-mono text-[11px] uppercase tracking-snug font-medium text-muted">
      {children}
    </th>
  );
}

export function ThNum({ children }: { children: ReactNode }) {
  return (
    <th className="text-right px-4 py-2 stk-mono text-[11px] uppercase tracking-snug font-medium text-muted">
      {children}
    </th>
  );
}

export function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}

export function TdNum({ children }: { children: ReactNode }) {
  return (
    <td className="px-4 py-3 align-top text-right stk-mono text-slate">
      {children}
    </td>
  );
}

/**
 * Standard `<thead>` + `<tbody>` row classes — saves having to remember the
 * subtle bg-surface-subtle / border-border-soft / hover:bg-bg-warm trio.
 */
export const tableHeadClass = "bg-surface-subtle";
export const tableBodyRowClass =
  "border-t border-border-soft hover:bg-bg-warm transition-colors";
