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
    // Clear params that don't survive tab switches: pagination resets, and
    // sort options are tab-specific (e.g. Unofficial has companies_desc that
    // Official doesn't). The user's q stays so a search persists.
    params.delete("page");
    params.delete("sort");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="border-b border-border-soft">
      <nav className="flex gap-6 text-sm">
        {tabs.map((tab) => {
          const isActive = current === tab.id;
          const className = [
            "pb-3 cursor-pointer border-b-2 transition-colors",
            isActive
              ? "border-navy text-heading"
              : "border-transparent text-muted hover:text-slate",
          ].join(" ");

          if (hrefFor) {
            return (
              <Link key={tab.id} href={hrefFor(tab.id)} className={className}>
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
      </nav>
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
            "stk-mono text-[10px] px-1.5 py-0.5 rounded-sm",
            active
              ? "bg-bg-warm text-muted"
              : "bg-surface-subtle text-muted-light",
          ].join(" ")}
        >
          {badge}
        </span>
      ) : null}
    </span>
  );
}
