"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "◫" },
  { href: "/companies", label: "Companies", icon: "▦" },
  { href: "/templates", label: "Templates", icon: "⊟" },
  { href: "/problems", label: "Problems", icon: "⚑" },
  { href: "/jobs", label: "Jobs", icon: "◷" },
];

// "Coming later" group from the mockup. Visible but disabled — sets expectation
// without committing the build. Order intentional (mockup order: Signals,
// Settings).
const COMING_LATER: NavItem[] = [
  { href: "/signals", label: "Signals", icon: "◇" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-surface border-r border-border-soft flex flex-col">
      <div className="px-5 py-4 border-b border-border-soft">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/brand/mark.svg"
            alt="Stacktic"
            width={28}
            height={28}
            priority
            className="rounded-md"
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-heading">Stacktic</div>
            <div className="stk-mono text-[10px] uppercase tracking-snug text-muted-light">
              Admin
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 text-sm">
        {PRIMARY.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="pt-4 px-3 stk-mono text-[10px] uppercase tracking-snug text-muted-light">
          Coming later
        </div>
        {COMING_LATER.map((item) => (
          <DisabledNavLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-border-soft text-xs text-muted flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-surface-subtle border border-border-soft grid place-items-center text-[10px] font-semibold text-slate">
          DS
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-slate truncate">Denny S.</div>
          <div className="stk-mono text-[10px] text-muted-light truncate">
            denny@helpscout.com
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 stk-mono text-[10px] text-muted-light">
        local · unauthenticated
      </div>
    </aside>
  );
}

function NavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string | null;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={[
        "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
        active
          ? "bg-navy text-white"
          : "text-slate hover:bg-bg-warm",
      ].join(" ")}
    >
      <span
        className={["text-base", active ? "text-white" : "text-muted-light"].join(
          " ",
        )}
        aria-hidden
      >
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

function DisabledNavLink({ item }: { item: NavItem }) {
  return (
    <span
      aria-disabled="true"
      title="Coming later"
      className="flex items-center gap-2 px-3 py-2 rounded-md text-muted-light cursor-not-allowed select-none"
    >
      <span className="text-base" aria-hidden>
        {item.icon}
      </span>
      {item.label}
    </span>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
