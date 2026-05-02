import type { ReactNode } from "react";

/**
 * Standard page header — title + optional subtitle + optional right-rail.
 *
 * Visual chrome matches the Backstage PageHead primitive: serif title with a
 * teal period, mono subtitle, line border. Kept around for callers that
 * pass a ReactNode title (PageHead's title is `string`-only).
 *
 * For new code prefer `PageHead` from `@/components/backstage`.
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
    <div className="flex items-end justify-between gap-6 border-b border-line pb-[22px] mb-[22px]">
      <div>
        <h1 className="font-serif text-[36px] font-normal tracking-[-0.015em] leading-none text-ink m-0">
          {title}
          <span className="text-teal-1">.</span>
        </h1>
        {subtitle ? (
          <p className="mt-[7px] font-mono text-[12px] text-muted tracking-[0.005em] max-w-2xl">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
