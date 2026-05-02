"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface SortOption {
  value: string;
  label: string;
}

/**
 * Dropdown that pushes its selection to ?sort= in the URL. Server pages read
 * the value via searchParams and apply ORDER BY accordingly.
 */
export function SortSelect({
  options,
  defaultValue,
}: {
  options: SortOption[];
  defaultValue?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current =
    searchParams.get("sort") ?? defaultValue ?? options[0]?.value ?? "";

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("sort", value);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 border border-border rounded-md text-sm bg-surface text-slate focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
