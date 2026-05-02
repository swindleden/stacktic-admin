import type { LifecycleStatus } from "@/lib/db/queries/orgs";

const TONE: Record<LifecycleStatus, string> = {
  active: "bg-success-soft text-success-text border-success-border",
  onboarding: "bg-teal-soft text-teal-deep border-border-soft",
  stalled: "bg-warning-soft text-warning-text border-warning-border",
  suspended: "bg-warning-soft text-warning-text border-warning-border",
  canceled: "bg-critical-soft text-critical-text border-critical-border",
};

const LABEL: Record<LifecycleStatus, string> = {
  active: "Active",
  onboarding: "Onboarding",
  stalled: "Stalled",
  suspended: "Suspended",
  canceled: "Canceled",
};

export function LifecyclePill({ status }: { status: LifecycleStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-sm border text-[11px] font-medium",
        TONE[status],
      ].join(" ")}
    >
      {LABEL[status]}
    </span>
  );
}
