import * as React from "react";
import { cn } from "./cn";

/* ─────────────────────────────────────────────────────────────
 * Panel — generic surface with optional header
 * Compose with FieldList, ActivityList, Checklist, ActionList.
 * ───────────────────────────────────────────────────────────── */

export function Panel({ children, className }: {
  children: React.ReactNode; className?: string;
}) {
  // Outer border uses `line-strong` to match the table treatment in
  // `data.tsx` and `ui/TableCard.tsx`. Panels and tables share the
  // same card-on-paper visual role, so they should frame identically.
  // Dark-mode inset top-highlight (1px white at 4%) gives the card
  // a subtle raised feel against the page bg — same trick applied
  // to the table primitives.
  return (
    <div
      className={cn(
        "bg-paper-4 border border-line-strong rounded-md overflow-hidden",
        "dark:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title, hint, action,
}: {
  title: string; hint?: React.ReactNode; action?: React.ReactNode;
}) {
  // Header bg `paper-2` + bottom divider `line-strong` mirror the
  // table-header treatment so panel headers and table headers read
  // as the same visual rank across the site-admin surface.
  return (
    <div className="flex items-center justify-between bg-paper-2 border-b border-line-strong px-[18px] py-2.5">
      <div className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-muted font-medium">{title}</div>
      {hint && <div className="font-mono text-[11px] text-muted-2">{hint}</div>}
      {action}
    </div>
  );
}

export function PanelBody({ children, className }: {
  children: React.ReactNode; className?: string;
}) {
  return <div className={cn("px-[18px] py-3.5", className)}>{children}</div>;
}

/* ─────────────────────────────────────────────────────────────
 * FieldList — key/value rows with mono labels
 * Used for the "Account" panel on company detail.
 * ───────────────────────────────────────────────────────────── */

export interface Field {
  label: string;
  value: React.ReactNode;
  /** Render the value in mono. Default: false. */
  mono?: boolean;
}

export function FieldList({ fields }: { fields: Field[] }) {
  return (
    <div className="flex flex-col">
      {fields.map((f, i) => (
        <div
          key={i}
          className="grid grid-cols-[140px_1fr] gap-3 py-2.5 border-b border-line-soft last:border-b-0 items-baseline"
        >
          <div className="font-mono text-[11px] tracking-[0.04em] uppercase text-muted">{f.label}</div>
          <div className={cn(
            "text-[13px] tracking-[-0.005em] text-ink min-w-0",
            f.mono && "font-mono text-[12.5px] tracking-[0]"
          )}>
            {f.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * ActivityList — recent events with mono event names + scope tags
 * ───────────────────────────────────────────────────────────── */

export interface ActivityItem {
  event: string;       // "user.invited"
  scope?: string;      // "auth" | "billing" | "ops"
  detail?: React.ReactNode;
  actor?: string;
  at: string;          // pre-formatted, e.g. "14:32" or "Apr 28"
  atTitle?: string;    // optional ISO string for tooltip
}

export function ActivityList({ items, max, empty }: { items: ActivityItem[]; max?: number; empty?: React.ReactNode }) {
  if (items.length === 0 && empty) {
    return <div className="font-mono text-[12px] text-muted py-2">{empty}</div>;
  }
  const list = max ? items.slice(0, max) : items;
  return (
    <ul className="flex flex-col">
      {list.map((it, i) => (
        <li
          key={i}
          className="grid grid-cols-[1fr_auto] gap-3 py-2.5 border-b border-line-soft last:border-b-0 items-baseline"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[12.5px] text-ink tracking-[0]">{it.event}</span>
              {it.scope && (
                <span className="font-mono text-[10px] tracking-[0.06em] uppercase text-teal bg-teal-1/10 px-1.5 py-px rounded-sm">
                  {it.scope}
                </span>
              )}
            </div>
            {it.detail && (
              <div className="text-[12.5px] text-ink-2 mt-1 tracking-[-0.005em] truncate">{it.detail}</div>
            )}
            {it.actor && (
              <div className="font-mono text-[11px] text-muted mt-0.5">{it.actor}</div>
            )}
          </div>
          <div className="font-mono text-[11px] text-muted shrink-0 whitespace-nowrap" title={it.atTitle}>{it.at}</div>
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Checklist — onboarding-style rows
 * ───────────────────────────────────────────────────────────── */

export interface ChecklistItem {
  label: string;
  done?: boolean;
  hint?: string;
}

export function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex items-start gap-3 py-2.5 border-b border-line-soft last:border-b-0"
        >
          <span
            className={cn(
              "shrink-0 mt-0.5 w-4 h-4 rounded-sm border grid place-items-center text-[10px] font-bold",
              it.done
                ? "bg-teal-1 border-teal-1 text-white"
                : "bg-paper-4 border-line-strong text-transparent"
            )}
          >
            ✓
          </span>
          <div className="min-w-0">
            <div className={cn(
              "text-[13px] tracking-[-0.005em]",
              it.done ? "text-ink-2 line-through decoration-line" : "text-ink"
            )}>
              {it.label}
            </div>
            {it.hint && (
              <div className="font-mono text-[11px] text-muted mt-0.5">{it.hint}</div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────────────
 * ActionList — admin-style row with description + button.
 * Set `danger` for destructive actions. `button` accepts a ReactNode
 * so callers can pass a server-action <form> or a <Link>.
 * ───────────────────────────────────────────────────────────── */

export interface AdminAction {
  label: string;
  hint?: string;
  /** Either pass a pre-rendered button (form, Link, etc.) or buttonLabel + onClick. */
  button?: React.ReactNode;
  buttonLabel?: string;
  danger?: boolean;
  onClick?: () => void;
}

export function ActionList({ actions }: { actions: AdminAction[] }) {
  return (
    <ul className="flex flex-col">
      {actions.map((a, i) => (
        <li
          key={i}
          className={cn(
            "flex items-center justify-between gap-4 py-3 border-b border-line-soft last:border-b-0",
            a.danger && "bg-danger-tint -mx-[18px] px-[18px]"
          )}
        >
          <div className="min-w-0">
            <div className={cn(
              "text-[13px] font-medium tracking-[-0.005em]",
              a.danger ? "text-danger" : "text-ink"
            )}>
              {a.label}
            </div>
            {a.hint && (
              <div className="font-mono text-[11px] text-muted mt-0.5">{a.hint}</div>
            )}
          </div>
          {a.button ? a.button : (
            <button
              type="button"
              onClick={a.onClick}
              className={cn(
                "shrink-0 inline-flex items-center px-3 py-1.5 rounded font-sans text-[12.5px] font-medium border cursor-pointer",
                a.danger
                  ? "bg-paper-4 border-danger/30 text-danger hover:bg-danger/10"
                  : "bg-paper-4 border-line-strong text-ink hover:bg-paper-3"
              )}
            >
              {a.buttonLabel}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────────────────────────────────────────────
 * DetailHeader — avatar + name + status pill on the left,
 * mono ID right-aligned. Used at the top of detail screens.
 * ───────────────────────────────────────────────────────────── */

export function DetailHeader({
  avatar, title, pill, id, controls,
}: {
  avatar: React.ReactNode;
  title: string;
  pill?: React.ReactNode;
  id?: string;
  controls?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center pb-[18px] mb-[18px] border-b border-line">
      <div className="flex items-center gap-3.5 min-w-0">
        {avatar}
        <h1 className="font-serif text-[28px] font-normal tracking-[-0.01em] leading-none m-0 truncate">
          {title}
        </h1>
        {pill}
      </div>
      <div className="flex items-center gap-3.5">
        {id && <span className="font-mono text-[11.5px] text-muted tracking-[0]">{id}</span>}
        {controls}
      </div>
    </div>
  );
}

export function DetailAvatar({ name, hue, size = 36, square = true }: {
  name: string; hue?: number; size?: number; square?: boolean;
}) {
  const h = hue ?? (name.length * 47) % 360;
  return (
    <div
      className={cn(
        "text-white grid place-items-center font-semibold tracking-[0.02em] shrink-0",
        square ? "rounded" : "rounded-full"
      )}
      style={{ width: size, height: size, background: `hsl(${h} 28% 30%)`, fontSize: size * 0.42 }}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}
