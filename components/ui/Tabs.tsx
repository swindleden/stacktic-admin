"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
}

/**
 * Tab bar driven by the `tab` query param. Selecting a tab updates the URL
 * (shallow) so server components on the same page can read the active tab
 * via searchParams. Falls back to the first tab when nothing is set.
 *
 * Two flavors:
 *   - `query` (default) — uses ?tab= and re-renders the same page.
 *   - `link`            — each tab is a real Link to a different path. Pass
 *                         `hrefFor` to build the URL.
 *
 * Visual chrome matches the Backstage Tabs primitive — flat underline,
 * mono badge tint sits on paper-2/3.
 */
export function Tabs({
  tabs,
  active,
  hrefFor,
}: {
  tabs: TabItem[];
  active?: string;
  hrefFor?: (id: string) => string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryActive = searchParams.get("tab") ?? tabs[0]?.id;
  const current = active ?? queryActive ?? tabs[0]?.id ?? "";

  function selectQueryTab(id: string) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", id);
    // Pagination resets; sort is tab-specific. Search stays.
    params.delete("page");
    params.delete("sort");
    router.replace(`${pathname}?${params.toString()}` as never, { scroll: false });
  }

  // `overflow-x-auto` allows horizontal scroll on narrow viewports where
  // the tab list would overflow. We pair it with `overflow-y-clip` to
  // suppress the spurious vertical scrollbar browsers paint when one
  // axis is set to auto and the other isn't explicitly constrained —
  // sub-pixel vertical overflow from the tab buttons (focus rings,
  // line-height rounding) was triggering a tiny y-scrollbar visible on
  // the right edge of the tab strip.
  return (
    <div className="flex gap-6 border-b border-line mb-[22px] px-0.5 overflow-x-auto overflow-y-clip">
      {tabs.map((tab) => {
        const isActive = current === tab.id;
        const className = [
          "py-2.5 pb-3 text-[13.5px] cursor-pointer border-b-2 -mb-px tracking-[-0.005em] whitespace-nowrap",
          isActive
            ? "text-ink font-semibold border-ink"
            : "text-muted border-transparent hover:text-ink-2",
        ].join(" ");

        if (hrefFor) {
          return (
            <Link key={tab.id} href={hrefFor(tab.id) as never} className={className}>
              <TabBody label={tab.label} badge={tab.badge} active={isActive} />
            </Link>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectQueryTab(tab.id)}
            className={className}
          >
            <TabBody label={tab.label} badge={tab.badge} active={isActive} />
          </button>
        );
      })}
    </div>
  );
}

function TabBody({
  label,
  badge,
  active,
}: {
  label: string;
  badge?: string | number;
  active: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {badge != null ? (
        <span
          className={[
            "font-mono text-[10px] px-1.5 py-0.5 rounded-sm tracking-[0.04em]",
            active
              ? "bg-paper-2 text-muted"
              : "bg-paper-3 text-muted-2",
          ].join(" ")}
        >
          {badge}
        </span>
      ) : null}
    </span>
  );
}
