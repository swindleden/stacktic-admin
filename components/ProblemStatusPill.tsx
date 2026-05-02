import { PROBLEM_STATUS, labelFor } from "@/lib/enums";

const TONE_FOR_STATUS: Record<number, string> = {
  1: "bg-warning-soft text-warning-text border-warning-border", // open
  2: "bg-teal-soft text-teal-deep border-border-soft", // acknowledged
  3: "bg-success-soft text-success-text border-success-border", // resolved
  4: "bg-surface-subtle text-muted border-border-soft", // dismissed
};

export function ProblemStatusPill({ status }: { status: number }) {
  const tone =
    TONE_FOR_STATUS[status] ??
    "bg-surface-subtle text-muted border-border-soft";
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-sm border",
        "text-[11px] font-medium",
        tone,
      ].join(" ")}
    >
      {labelFor(PROBLEM_STATUS, status)}
    </span>
  );
}
