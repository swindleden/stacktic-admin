import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/components/backstage";

type Tone = "neutral" | "good" | "warn" | "bad";

const VALUE_TONE: Record<Tone, string> = {
  neutral: "text-ink",
  good: "text-teal",
  warn: "text-amber",
  bad: "text-danger",
};

const ACCENT_TONE: Record<Tone, string> = {
  neutral: "bg-teal-1/55",
  good: "bg-teal-1/55",
  warn: "bg-amber/55",
  bad: "bg-danger/55",
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
 * Visual chrome matches the Backstage KPI primitive (paper-4 fill, line
 * border, teal accent bar, 32px tabular-figure value). When `href` is set
 * the entire card is a Link and the accent bar gets a hover lift —
 * how the dashboard pivots into filtered list views.
 */
export function StatCard({
  label,
  value,
  sub,
  href,
  tone = "neutral",
}: StatCardProps) {
  const baseClass =
    "relative block bg-paper-4 border border-line rounded-md p-4 pl-[18px] overflow-hidden";
  const interactiveClass = href
    ? "transition-colors hover:border-line-strong hover:bg-paper-3 group"
    : "";

  const body = (
    <>
      <span className={cn("absolute left-0 top-0 bottom-0 w-0.5", ACCENT_TONE[tone])} />
      <div className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-muted font-medium flex items-center gap-1">
        {label}
        {href ? (
          <span
            aria-hidden
            className="opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[10px]"
          >
            ↗
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "font-sans text-[32px] font-medium tracking-[-0.025em] leading-none mt-2 [font-feature-settings:'tnum']",
          VALUE_TONE[tone],
        )}
      >
        {value}
      </div>
      {sub ? (
        <div className="font-mono text-[11.5px] text-muted mt-1.5 tracking-[0.01em]">{sub}</div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href as never} className={cn(baseClass, interactiveClass)}>
        {body}
      </Link>
    );
  }
  return <div className={baseClass}>{body}</div>;
}
