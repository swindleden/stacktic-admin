/**
 * Small formatting helpers for the operator console.
 *
 * Kept tiny on purpose — date-fns / dayjs aren't needed for the handful of
 * places we render times. If this file grows past ~10 helpers, reach for a
 * library.
 */

const RELATIVE_THRESHOLDS: Array<[number, Intl.RelativeTimeFormatUnit]> = [
  [60, "second"],
  [60 * 60, "minute"],
  [60 * 60 * 24, "hour"],
  [60 * 60 * 24 * 7, "day"],
  [60 * 60 * 24 * 30, "week"],
  [60 * 60 * 24 * 365, "month"],
  [Number.POSITIVE_INFINITY, "year"],
];

/** Compact relative time, e.g. "3m ago", "2d ago", "—" for null. */
export function relativeTime(
  value: Date | string | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  const diffSec = (now.getTime() - date.getTime()) / 1000;
  if (Number.isNaN(diffSec)) return "—";

  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });

  let unit: Intl.RelativeTimeFormatUnit = "second";
  let value_in_unit = diffSec;

  for (let i = 0; i < RELATIVE_THRESHOLDS.length; i++) {
    const entry = RELATIVE_THRESHOLDS[i];
    if (!entry) continue;
    const [threshold, candidateUnit] = entry;
    if (Math.abs(diffSec) < threshold) {
      unit = candidateUnit;
      const divisor = i === 0 ? 1 : (RELATIVE_THRESHOLDS[i - 1]?.[0] ?? 1);
      value_in_unit = diffSec / divisor;
      break;
    }
  }

  return fmt.format(-Math.round(value_in_unit), unit);
}

/** Locale-formatted absolute date: "Apr 24, 2026". */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Compact integer, e.g. 1234 → "1,234". null/undefined → "—". */
export function formatInt(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}
