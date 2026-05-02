import type { ReactNode } from "react";
import { ORG_STATUS, SIGNAL_SEVERITY, labelFor } from "@/lib/enums";

type Tone = "neutral" | "good" | "warn" | "bad" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-surface-subtle text-muted border-border-soft",
  good: "bg-success-soft text-success-text border-success-border",
  warn: "bg-warning-soft text-warning-text border-warning-border",
  bad: "bg-critical-soft text-critical-text border-critical-border",
  info: "bg-teal-soft text-teal-deep border-border-soft",
};

function pillClasses(tone: Tone) {
  return [
    "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5",
    "stk-mono text-[10px] uppercase tracking-snug",
    TONE_CLASSES[tone],
  ].join(" ");
}

const ORG_STATUS_TONE: Record<number, Tone> = {
  1: "good", // active
  2: "info", // trial
  3: "warn", // suspended
  4: "bad", // canceled
};

export function OrgStatusPill({ status }: { status: number }) {
  const tone = ORG_STATUS_TONE[status] ?? "neutral";
  return (
    <span className={pillClasses(tone)}>{labelFor(ORG_STATUS, status)}</span>
  );
}

const SEVERITY_TONE: Record<number, Tone> = {
  1: "info", // info
  2: "warn", // warning
  3: "bad", // critical
};

export function SignalSeverityPill({ severity }: { severity: number }) {
  const tone = SEVERITY_TONE[severity] ?? "neutral";
  return (
    <span className={pillClasses(tone)}>
      {labelFor(SIGNAL_SEVERITY, severity)}
    </span>
  );
}

export function PlainPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <span className={pillClasses(tone)}>{children}</span>;
}
