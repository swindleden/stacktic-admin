import type { ReactNode } from "react";

/**
 * Empty / informational state. Used when:
 *   - DATABASE_URL isn't configured (first-time local dev)
 *   - A query returns zero rows
 *   - A page is intentionally a placeholder
 *
 * Visual chrome follows the Backstage rule: serif headline + mono subtitle,
 * no illustration. Empty is a real state, not a missing one.
 */
export function EmptyState({
  title,
  body,
  footer,
}: {
  title: string;
  body?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-line bg-paper-4 px-6 py-12 text-center">
      <h2 className="font-serif text-[22px] font-normal tracking-[-0.015em] leading-none text-ink m-0">
        {title}
      </h2>
      {body ? (
        <div className="mt-3 font-mono text-[12px] text-muted tracking-[0.005em] max-w-md mx-auto">
          {body}
        </div>
      ) : null}
      {footer ? (
        <div className="mt-4 font-mono text-[11px] text-muted-2">{footer}</div>
      ) : null}
    </div>
  );
}
