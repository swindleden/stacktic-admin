import type { ReactNode } from "react";

/**
 * Standard page header — title + optional subtitle + optional right-rail.
 * Used by every operator-console page so headers stay visually consistent.
 */
export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 border-b border-border-soft pb-5 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-heading">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted max-w-2xl">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
