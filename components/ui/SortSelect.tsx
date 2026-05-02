"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface SortOption {
  value: string;
  label: string;
}

/**
 * Native <select> styled to match the Backstage SelectTrigger. Pushes the
 * selection into a URL query param (default `?sort=`) so server pages can
 * read it via searchParams. Resets `?page` on change so a sort flip doesn't
 * stick the user on a now-empty page.
 *
 * Pass `param="status"` (etc.) when reusing this for filter dropdowns.
 */
export function SortSelect({
  options,
  defaultValue,
  param = "sort",
}: {
  options: SortOption[];
  defaultValue?: string;
  param?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current =
    searchParams.get(param) ?? defaultValue ?? options[0]?.value ?? "";

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "" || value === defaultValue) {
      params.delete(param);
    } else {
      params.set(param, value);
    }
    params.delete("page");
    const qs = params.toString();
    router.replace((qs ? `${pathname}?${qs}` : pathname) as never, { scroll: false });
  }

  return (
    <div className="relative">
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-paper-4 border border-line rounded px-3 pr-8 py-1.5 font-mono text-[12.5px] text-ink-2 hover:bg-paper-3 cursor-pointer focus:outline-none focus:border-line-strong"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-2 text-[12px]">⌄</span>
    </div>
  );
}
