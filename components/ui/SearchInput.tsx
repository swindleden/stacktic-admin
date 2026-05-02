"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Pushes the current value into ?q= on the URL with a 200ms debounce. Server
 * components on the same page read q via searchParams and re-render. Cleared
 * when the input goes empty.
 *
 * Visual chrome matches the Backstage SearchInput primitive so we get
 * consistent paper-4 fill, ⌕ glyph, and ⌘K kbd hint without losing the
 * URL-debounced behavior the operator pages expect.
 */
export function SearchInput({
  placeholder = "Search…",
  shortcut = "⌘K",
}: {
  placeholder?: string;
  shortcut?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set("q", value);
      else params.delete("q");
      params.delete("page");
      const qs = params.toString();
      router.replace((qs ? `${pathname}?${qs}` : pathname) as never, { scroll: false });
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="flex items-center gap-2 bg-paper-4 border border-line rounded px-3 py-1.5 w-[280px] text-[13px] text-muted focus-within:border-line-strong">
      <span className="opacity-55">⌕</span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-ink placeholder:text-muted"
      />
      {shortcut && (
        <kbd className="font-mono text-[10px] text-muted-2 bg-paper-2 border border-line rounded-sm px-1.5 py-px">
          {shortcut}
        </kbd>
      )}
    </label>
  );
}
