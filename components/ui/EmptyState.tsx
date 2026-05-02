import type { ReactNode } from "react";

/**
 * Shared empty / informational state. Used when:
 *   - DATABASE_URL isn't configured yet (first-time local dev)
 *   - A query returns zero rows
 *   - A page is intentionally a placeholder
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
    <div className="rounded-md border border-dashed border-border bg-surface px-6 py-10 text-center">
      <h2 className="text-base font-medium text-heading">{title}</h2>
      {body ? <div className="mt-2 text-sm text-muted">{body}</div> : null}
      {footer ? <div className="mt-4 text-xs text-muted-light">{footer}</div> : null}
    </div>
  );
}
