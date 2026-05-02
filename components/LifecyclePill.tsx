import type { LifecycleStatus } from "@/lib/db/queries/orgs";
import { Pill, type PillKind } from "@/components/backstage";

/**
 * Maps the operator-side lifecycle status onto the Backstage Pill primitive.
 * `active` → green dot, `onboarding/trial` → neutral, `stalled` → amber,
 * `suspended/canceled` → red. Tone semantics mirror the rest of Backstage.
 */
const KIND: Record<LifecycleStatus, PillKind> = {
  active:     "active",
  onboarding: "onboarding",
  stalled:    "stalled",
  suspended:  "suspended",
  canceled:   "canceled",
};

const LABEL: Record<LifecycleStatus, string> = {
  active:     "active",
  onboarding: "onboarding",
  stalled:    "stalled",
  suspended:  "suspended",
  canceled:   "canceled",
};

export function LifecyclePill({ status }: { status: LifecycleStatus }) {
  return <Pill kind={KIND[status]}>{LABEL[status]}</Pill>;
}
