/**
 * Enum labels mirrored from handoff/specs/stacktic_enum_reference.md.
 *
 * The integers stored in Postgres are the source of truth; this module just
 * gives them human-readable labels for the operator console UI. If the
 * canonical doc adds a value, add it here too.
 *
 * Anything unmapped renders as `unknown(<n>)` so the UI never crashes on a
 * future enum value the operator console hasn't been updated to know about.
 */

export const ORG_STATUS: Record<number, string> = {
  1: "active",
  2: "trial",
  3: "suspended",
  4: "canceled",
};

export const ORG_PLAN: Record<number, string> = {
  1: "free",
  2: "starter",
  3: "pro",
  4: "enterprise",
};

export const SIGNAL_SEVERITY: Record<number, string> = {
  1: "info",
  2: "warning",
  3: "critical",
};

export const SIGNAL_STATUS: Record<number, string> = {
  1: "active",
  2: "resolved",
  3: "suppressed",
};

export const TOOL_STATUS: Record<number, string> = {
  1: "pending",
  2: "active",
  3: "archived",
};

export const EMPLOYMENT_STATUS: Record<number, string> = {
  1: "active",
  2: "inactive",
  3: "contractor",
};

/**
 * Backstage problem-report status. Source of truth lives in site-app's
 * `lib/db/enums.ts` (BackstageProblemStatus). Keep these labels in sync.
 */
export const PROBLEM_STATUS: Record<number, string> = {
  1: "open",
  2: "acknowledged",
  3: "resolved",
  4: "dismissed",
};

export function labelFor(
  map: Record<number, string>,
  value: number | null | undefined,
): string {
  if (value == null) return "—";
  return map[value] ?? `unknown(${value})`;
}
