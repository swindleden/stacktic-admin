import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "neutral" | "good" | "warn" | "bad";

const VALUE_TONE: Record<Tone, string> = {
  neutral: "text-heading",
  good: "text-success-text",
  warn: "text-warning-text",
  bad: "text-critical-text",
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Optional second line — counts, comparisons, qualifiers. */
  sub?: ReactNode;
  /** Click target. Renders as a Link if set; plain card otherwise. */
  href?: string;
  /** Color of the headline value. */
  tone?: Tone;
}

/**
 * Single stat card — number + label + optional sub-line.
 *
 * Used everywhere we want a "scoreboard" panel: dashboard, list-page tops,
 * profile sub-stats. When `href` is set the entire card is a hover-styled
 * link, which is how the dashboard pivots into filtered list views.
 */
export function StatCard({
  label,
  value,
  sub,
  href,
  tone = "neutral",
}: StatCardProps) {
  const baseClass =
    "block bg-surface border border-border rounded-md p-4 shadow-stk-sm";
  const interactiveClass = href
    ? "transition-colors hover:border-border-strong hover:bg-bg-warm group"
    : "";
  const valueClass = VALUE_TONE[tone];

  const body = (
    <>
      <div className="text-xs text-muted-light flex items-center gap-1">
        {label}
        {href ? (
          <span
            aria-hidden
            className="opacity-0 group-hover:opacity-100 transition-opacity stk-mono text-[10px]"
          >
            ↗
          </span>
        ) : null}
      </div>
      <div className={`text-2xl font-semibold mt-1 ${valueClass}`}>{value}</div>
      {sub ? (
        <div className="stk-mono text-[11px] text-muted mt-1">{sub}</div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${baseClass} ${interactiveClass}`}>
        {body}
      </Link>
    );
  }
  return <div className={baseClass}>{body}</div>;
}
