import type { ReactNode } from "react";
import { ORG_STATUS, SIGNAL_SEVERITY, labelFor } from "@/lib/enums";
import { Pill, type PillKind } from "@/components/backstage";

/**
 * Generic enum-driven status pills. Both OrgStatusPill and SignalSeverityPill
 * map their numeric enum onto the Backstage Pill primitive — one pill chrome,
 * one set of color rules, no per-component theming.
 */

const ORG_STATUS_KIND: Record<number, PillKind> = {
  1: "active",     // active
  2: "trial",      // trial
  3: "suspended",  // suspended
  4: "canceled",   // canceled
};

export function OrgStatusPill({ status }: { status: number }) {
  return (
    <Pill kind={ORG_STATUS_KIND[status] ?? "neutral"}>
      {labelFor(ORG_STATUS, status).toLowerCase()}
    </Pill>
  );
}

const SEVERITY_KIND: Record<number, PillKind> = {
  1: "neutral",   // info
  2: "open",      // warning (amber)
  3: "failed",    // critical (red)
};

export function SignalSeverityPill({ severity }: { severity: number }) {
  return (
    <Pill kind={SEVERITY_KIND[severity] ?? "neutral"}>
      {labelFor(SIGNAL_SEVERITY, severity).toLowerCase()}
    </Pill>
  );
}

/**
 * Free-form pill — pass any of the Backstage `PillKind` values, plus content.
 * Matches the shape callers used to expect (children + optional tone), with
 * tones now mapped onto Backstage kinds.
 */
type Tone = "neutral" | "good" | "warn" | "bad" | "info";

const TONE_TO_KIND: Record<Tone, PillKind> = {
  neutral: "neutral",
  good:    "active",
  warn:    "open",
  bad:     "failed",
  info:    "neutral",
};

export function PlainPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <Pill kind={TONE_TO_KIND[tone]}>{children}</Pill>;
}
