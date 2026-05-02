import * as React from "react";
import { cn } from "./cn";

/* ─────────────────────────────────────────────────────────────
 * KPI — single metric card. Use inside <KPIGrid>.
 * `value` accepts ReactNode so you can render a muted em-dash for "no data yet".
 * `subValue` is the line beneath the value (e.g. "148 active").
 * `delta` + `trend` produce a small mono trend indicator on the same row.
 * `tone="warn"` paints the value in amber and the accent bar amber too —
 * use for stalled/at-risk metrics.
 * ───────────────────────────────────────────────────────────── */

export type KPITrend = "up" | "down" | "flat";
export type KPITone = "default" | "warn";

export interface KPIProps {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  delta?: string;
  trend?: KPITrend;
  tone?: KPITone;
}

export function KPI({ label, value, subValue, delta, trend, tone = "default" }: KPIProps) {
  return (
    <div className="relative bg-paper-4 border border-line rounded-md p-4 pl-[18px] overflow-hidden">
      <span className={cn(
        "absolute left-0 top-0 bottom-0 w-0.5",
        tone === "warn" ? "bg-amber/55" : "bg-teal-1/55"
      )} />
      <div className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-muted font-medium">{label}</div>
      <div className="flex items-baseline justify-between gap-2.5 mt-2">
        <div className={cn(
          "font-sans text-[32px] font-medium tracking-[-0.025em] leading-none [font-feature-settings:'tnum']",
          tone === "warn" ? "text-amber" : "text-ink"
        )}>
          {value}
        </div>
        {delta && (
          <div className={cn("font-mono text-[11px] font-medium tracking-[0.02em]",
            trend === "up" || trend === "down" ? "text-teal" : "text-muted"
          )}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {delta}
          </div>
        )}
      </div>
      {subValue && (
        <div className="font-mono text-[11.5px] text-muted mt-1.5 tracking-[0.01em]">{subValue}</div>
      )}
    </div>
  );
}

export function KPIGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-[22px]", className)}>{children}</div>;
}

/* ─────────────────────────────────────────────────────────────
 * Table — render-prop style. Pass `cols` (grid template) and rows.
 * Grid-driven (no <table>) for inline-editing-friendly markup.
 * ───────────────────────────────────────────────────────────── */

export interface TableColumn<Row> {
  key: string;
  header: React.ReactNode;
  align?: "left" | "right";
  render: (row: Row) => React.ReactNode;
}

export function Table<Row>({
  cols,
  columns,
  rows,
  rowKey,
  footer,
  empty,
}: {
  /** CSS grid-template-columns string, e.g. "1.5fr 1.4fr .7fr ..." */
  cols: string;
  columns: TableColumn<Row>[];
  rows: Row[];
  rowKey: (r: Row) => string;
  footer?: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const gridStyle: React.CSSProperties = { gridTemplateColumns: cols };
  // Border uses `line-strong` for visible edge contrast. Dark-mode
  // inset top-highlight matches TableCard — see note there.
  return (
    <div className="bg-paper-4 border border-line-strong rounded-md overflow-hidden dark:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div
        // Header bg uses `paper-2` for visible contrast. `gap-x-4`
        // gives cells 16px of breathing room — without it,
        // right-aligned cells (e.g. "Last active") run flush against
        // adjacent left-aligned ones (e.g. "Status"), reading as a
        // single concatenated word. Same gap on the body row below
        // so cell positions stay aligned across header and body.
        className="grid items-center gap-x-4 bg-paper-2 border-b border-line-strong px-[18px] py-2.5 font-mono text-[10px] tracking-[0.1em] uppercase text-muted font-medium"
        style={gridStyle}
      >
        {columns.map((c) => (
          <div key={c.key} className={c.align === "right" ? "text-right" : ""}>{c.header}</div>
        ))}
      </div>
      {rows.length === 0 && empty ? (
        <div className="px-[18px] py-12">{empty}</div>
      ) : (
        rows.map((r) => (
          <div
            key={rowKey(r)}
            // `gap-x-4` matches the header's gap so cell positions
            // align across header and body. See header note above.
            className="grid items-center gap-x-4 px-[18px] py-3 border-b border-line-soft text-[13.5px] hover:bg-paper-3 last:border-b-0"
            style={gridStyle}
          >
            {columns.map((c) => (
              <div key={c.key} className={c.align === "right" ? "text-right" : "min-w-0"}>{c.render(r)}</div>
            ))}
          </div>
        ))
      )}
      {footer && (
        // Footer bg matches the header (`paper-2`) — same head/foot
        // symmetry as TableCard. See note in `components/ui/TableCard.tsx`.
        <div className="flex justify-between items-center px-[18px] py-2.5 border-t border-line-strong bg-paper-2 font-mono text-[11.5px] text-muted tracking-[0.02em]">
          {footer}
        </div>
      )}
    </div>
  );
}

/* Convenience cell renderers — keep your column.render functions tiny. */

export function CellMono({ children, tone = "ink-2", className }: {
  children: React.ReactNode; tone?: "ink" | "ink-2" | "muted"; className?: string;
}) {
  const toneClass = tone === "ink" ? "text-ink" : tone === "muted" ? "text-muted" : "text-ink-2";
  return <span className={cn("font-mono text-[12.5px] [font-feature-settings:'tnum']", toneClass, className)}>{children}</span>;
}

export function CellNumber({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[12.5px] font-medium text-ink [font-feature-settings:'tnum']">{children}</span>;
}

export function CellAvatar({ name, hue, square = true }: { name: string; hue?: number; square?: boolean }) {
  const h = hue ?? (name.length * 47) % 360;
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className={cn(
          "w-6 h-6 shrink-0 text-white grid place-items-center text-[11px] font-semibold tracking-[0.02em]",
          square ? "rounded" : "rounded-full"
        )}
        style={{ background: `hsl(${h} 28% 30%)` }}
      >
        {name[0]?.toUpperCase()}
      </div>
      <span className="font-semibold tracking-[-0.005em] truncate">{name}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Pagination — link-based (works with server-rendered pages).
 * Pass `hrefForPage(p)` and we render <a>s. Use `onChange` for
 * client-controlled tables.
 * ───────────────────────────────────────────────────────────── */

export function Pagination({
  page, totalPages, hrefForPage, onChange,
}: {
  page: number;
  totalPages: number;
  hrefForPage?: (p: number) => string;
  onChange?: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const visible = pageWindow(page, totalPages);
  return (
    <div className="flex gap-1.5 items-center">
      <PageButton href={hrefForPage?.(Math.max(1, page - 1))} onClick={() => onChange?.(Math.max(1, page - 1))} disabled={page === 1}>Prev</PageButton>
      {visible.map((p, i) =>
        p === "…" ? (
          <span key={i} className="text-muted-2 px-0.5">…</span>
        ) : (
          <PageButton key={i} on={p === page} href={hrefForPage?.(p)} onClick={() => onChange?.(p)}>{p}</PageButton>
        )
      )}
      <PageButton href={hrefForPage?.(Math.min(totalPages, page + 1))} onClick={() => onChange?.(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next</PageButton>
    </div>
  );
}

function PageButton({ on, href, children, onClick, disabled }: {
  on?: boolean; href?: string; children: React.ReactNode; onClick?: () => void; disabled?: boolean;
}) {
  const base = cn(
    "px-2.5 py-1 border rounded-sm font-mono text-[11px]",
    on
      ? "bg-ink text-paper border-ink"
      : "bg-paper-4 border-line text-muted hover:text-ink",
    disabled && "opacity-40 pointer-events-none"
  );
  if (href && !disabled && !on) {
    return <a href={href} className={cn(base, "cursor-pointer")}>{children}</a>;
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(base, "cursor-pointer")}>{children}</button>
  );
}

function pageWindow(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (page > 3) out.push("…");
  for (let p = Math.max(2, page - 1); p <= Math.min(total - 1, page + 1); p++) out.push(p);
  if (page < total - 2) out.push("…");
  out.push(total);
  return out;
}
