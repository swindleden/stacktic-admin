import * as React from "react";
import { cn } from "./cn";

/* ─────────────────────────────────────────────────────────────
 * PageHead — h1 with teal period, subtitle, right-side controls.
 * The `.` is the only decorative use of brand color in chrome —
 * keep it sparse.
 * ───────────────────────────────────────────────────────────── */

export function PageHead({
  title, subtitle, controls,
}: {
  title: string; subtitle?: React.ReactNode; controls?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-end pb-[22px] mb-[22px] border-b border-line gap-6">
      <div>
        <h1 className="font-serif text-[36px] font-normal tracking-[-0.015em] leading-none m-0 text-ink">
          {title}
          <span className="text-teal-1">.</span>
        </h1>
        {subtitle && (
          <div className="font-mono text-[12px] text-muted mt-[7px] tracking-[0.005em]">{subtitle}</div>
        )}
      </div>
      {controls && <div className="flex gap-2.5 items-center">{controls}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Breadcrumbs
 * ───────────────────────────────────────────────────────────── */

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <div className="font-mono text-[11.5px] text-muted tracking-[0.04em] mb-3.5">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="mx-2 text-muted-2">/</span>}
          {i === items.length - 1 ? (
            <b className="text-ink font-medium">{it.label}</b>
          ) : it.href ? (
            <a href={it.href} className="hover:text-ink hover:underline">{it.label}</a>
          ) : (
            <span>{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Tabs — flat underline tabs (matches the company-detail screen).
 * Pure presentation; the active tab is whatever you pass in.
 * ───────────────────────────────────────────────────────────── */

export interface TabItem {
  id: string;
  label: string;
  href?: string;
}

export function Tabs({ items, active, onChange, className }: {
  items: TabItem[];
  active?: string;
  onChange?: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-6 border-b border-line mb-[22px] px-0.5 overflow-x-auto", className)}>
      {items.map((t) => {
        const on = active === t.id;
        const cls = cn(
          "py-2.5 pb-3 text-[13.5px] cursor-pointer border-b-2 -mb-px tracking-[-0.005em] whitespace-nowrap",
          on
            ? "text-ink font-semibold border-ink"
            : "text-muted border-transparent hover:text-ink-2"
        );
        if (t.href) {
          return <a key={t.id} href={t.href} className={cls}>{t.label}</a>;
        }
        return (
          <button key={t.id} type="button" onClick={() => onChange?.(t.id)} className={cls}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
