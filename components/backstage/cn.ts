/**
 * Tiny class-name joiner — drop-in replacement for `clsx`. Filters falsy
 * values and joins on space. Used by the Backstage primitives.
 */
export type ClassValue = string | number | boolean | undefined | null | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const v of inputs) {
    if (!v && v !== 0) continue;
    if (Array.isArray(v)) {
      const inner = cn(...v);
      if (inner) out.push(inner);
    } else if (typeof v === "string" || typeof v === "number") {
      out.push(String(v));
    }
  }
  return out.join(" ");
}
