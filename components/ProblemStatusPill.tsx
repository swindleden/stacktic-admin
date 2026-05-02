import { PROBLEM_STATUS, labelFor } from "@/lib/enums";
import { Pill, type PillKind } from "@/components/backstage";

/**
 * Maps PROBLEM_STATUS enum values onto the Backstage Pill primitive.
 *  1 = open         → amber
 *  2 = acknowledged → neutral
 *  3 = resolved     → teal/active
 *  4 = dismissed    → neutral
 */
const KIND_FOR_STATUS: Record<number, PillKind> = {
  1: "open",
  2: "neutral",
  3: "resolved",
  4: "ignored",
};

export function ProblemStatusPill({ status }: { status: number }) {
  const kind = KIND_FOR_STATUS[status] ?? "neutral";
  return <Pill kind={kind}>{labelFor(PROBLEM_STATUS, status).toLowerCase()}</Pill>;
}
