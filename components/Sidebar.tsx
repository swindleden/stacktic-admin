"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/backstage/cn";
import { signOutAction } from "@/components/auth-actions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

// Lucide-ish glyphs rendered as inline SVG paths so we don't need a runtime
// icon dep. Each is a 14×14 stroke icon at currentColor — tinted teal/mint
// when its row is active.
const Icon = {
  Dashboard: (
    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="1.5" width="4.5" height="5.5" rx="1" />
      <rect x="8" y="1.5" width="4.5" height="3.5" rx="1" />
      <rect x="1.5" y="9" width="4.5" height="3.5" rx="1" />
      <rect x="8" y="6.5" width="4.5" height="6" rx="1" />
    </svg>
  ),
  Companies: (
    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="3" width="11" height="9" rx="1" />
      <path d="M1.5 6h11M5 3V1.8M9 3V1.8" />
    </svg>
  ),
  Templates: (
    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="1.5" width="11" height="11" rx="1.2" />
      <path d="M1.5 5h11M5 5v7.5" />
    </svg>
  ),
  Problems: (
    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1.6 13 12.4H1z" />
      <path d="M7 5.5v3.2M7 10.6v0.4" />
    </svg>
  ),
  Jobs: (
    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="7" cy="7" r="5.4" />
      <path d="M7 4v3l2 1.6" />
    </svg>
  ),
  Signals: (
    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2 8.5 5 5.5l2.5 2.5L12 3.2" />
      <circle cx="12" cy="3.2" r="1.2" />
    </svg>
  ),
  Settings: (
    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="7" cy="7" r="2" />
      <path d="M7 1v1.6M7 11.4V13M1 7h1.6M11.4 7H13M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M2.6 11.4l1.1-1.1M10.3 3.7l1.1-1.1" />
    </svg>
  ),
};

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Icon.Dashboard },
  { href: "/companies", label: "Companies", icon: Icon.Companies },
  { href: "/templates", label: "Templates", icon: Icon.Templates },
  { href: "/problems",  label: "Problems",  icon: Icon.Problems },
  { href: "/jobs",      label: "Jobs",      icon: Icon.Jobs },
];

// "Coming later" group — visible but disabled. Sets expectation without
// committing the build. Order intentional (mockup order: Signals, Settings).
const COMING_LATER: NavItem[] = [
  { href: "/signals",  label: "Signals",  icon: Icon.Signals },
  { href: "/settings", label: "Settings", icon: Icon.Settings },
];

/**
 * `user` is passed in from `app/layout.tsx` (server component) which
 * resolves the session via `auth()`. The Sidebar itself is a client
 * component because it needs `usePathname` for active-row styling
 * and local UI state for the drop-up user menu — passing the user
 * down avoids a separate client-side session fetch.
 */
export interface SidebarUser {
  name: string | null;
  email: string | null;
  image: string | null;
}

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  return (
    <aside className="bg-paper-2 border-r border-line p-[18px_14px_14px] flex flex-col gap-[18px]">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 py-1.5 -m-2 rounded hover:bg-ink/[0.03]">
        <Image
          src="/brand/mark.svg"
          alt="Stacktic"
          width={28}
          height={28}
          priority
          className="rounded-md"
        />
        <div>
          <div className="text-[14.5px] font-semibold tracking-[-0.01em] leading-none text-ink">Stacktic</div>
          <div className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-muted mt-[3px]">
            Backstage
          </div>
        </div>
      </Link>

      <nav className="flex flex-col gap-px">
        {PRIMARY.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div>
        <div className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-muted-2 px-2.5 pt-2 pb-1">
          Coming later
        </div>
        <nav className="flex flex-col gap-px">
          {COMING_LATER.map((item) => (
            <DisabledNavLink key={item.href} item={item} />
          ))}
        </nav>
      </div>

      <UserMenu user={user} />
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────
 * UserMenu — bottom-of-sidebar identity card with a drop-up menu.
 *
 * Menu items today:
 *   • Theme toggle (light/dark) — local UI state
 *   • Sign out                  — server action via Auth.js signOut
 *
 * The scaffolding (popover positioning, click-outside, keyboard,
 * focus management) is sized for more items — a preferences row or
 * a "switch org" impersonation picker drops in as one more JSX line.
 * ───────────────────────────────────────────────────────────── */

type Theme = "light" | "dark";

function UserMenu({ user }: { user: SidebarUser }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Hydrate from localStorage + persisted html attribute on mount.
  // Setting `data-theme` on `<html>` is what flips the CSS variables
  // defined in tokens.css; we keep state in sync so the menu label
  // ("Light mode" / "Dark mode") matches reality.
  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? (window.localStorage.getItem("stk-theme") as Theme | null)
        : null;
    const initial: Theme = stored === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  // Close on click-outside (mousedown so clicks inside the menu's
  // own buttons still register as belonging to the menu).
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  // Esc closes the menu and returns focus to the trigger.
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem("stk-theme", next);
    } catch {
      // Quota / private mode — silently accept; the in-memory state
      // is enough for the current session.
    }
  }

  // Identity strings derived from the session prop. Falls back to
  // "Operator" / "—" when Google didn't return name/email (shouldn't
  // happen in practice with the basic profile scope but defensive
  // for the type-narrowing).
  const displayName = user.name?.trim() || user.email || "Operator";
  const displayEmail = user.email ?? "—";
  const initials = computeInitials(user.name, user.email);
  const domain = user.email?.split("@")[1]?.toLowerCase() ?? null;

  return (
    <div ref={containerRef} className="mt-auto border-t border-line pt-3 relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-1/40"
      >
        {user.image ? (
          // Google profile image. `referrerPolicy="no-referrer"`
          // sidesteps Google's referer-based blocking on profile
          // images served from googleusercontent.com.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            referrerPolicy="no-referrer"
            className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold tracking-[0.04em] text-paper">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium leading-[1.2] text-ink">
            {displayName}
          </div>
          <div className="mt-0.5 truncate font-mono text-[10.5px] text-muted">
            {displayEmail}
          </div>
        </div>
        {/* Caret — points up when closed (menu opens upward), flips on open. */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn(
            "flex-shrink-0 text-muted-2 transition-transform",
            open && "rotate-180",
          )}
        >
          <path d="M3 7.5 6 4.5 9 7.5" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="User menu"
          className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-md border border-line-strong bg-paper-4 shadow-stk-md"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              toggleTheme();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-paper-3"
          >
            {/* Sun (light → switch to dark) / Moon (dark → switch to light) */}
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          {/*
            Sign-out is a server action (defined in `auth-actions.ts`)
            so the cookie cleanup happens server-side. The action ends
            with a `redirect("/login")` so the page navigates away —
            closing the menu manually here is moot AND breaks the
            action: setting state in the button's onClick caused the
            <form> to unmount before React's server-action runtime
            could submit it, so the action silently never fired.
            Letting the form submit normally + relying on the
            server-side redirect is both simpler and correct.
          */}
          <form action={signOutAction} className="border-t border-line-soft">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-paper-3"
            >
              <SignOutIcon />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      ) : null}

      <div className="px-2.5 pt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-2">
        {domain ? `signed in · ${domain}` : "signed in"}
      </div>
    </div>
  );
}

/**
 * Compute initials for the avatar fallback. Prefers two letters from
 * the name (first + last), falls back to two letters of the email
 * local-part, falls back to a literal "·" if neither yields anything
 * usable.
 */
function computeInitials(
  name: string | null,
  email: string | null,
): string {
  const trimmed = name?.trim() ?? "";
  if (trimmed.length > 0) {
    const parts = trimmed.split(/\s+/).filter((p) => p.length > 0);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    const combined = (first + last).toUpperCase();
    if (combined.length > 0) return combined;
  }
  const local = email?.split("@")[0] ?? "";
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  if (local.length === 1) return local.toUpperCase();
  return "·";
}

function SunIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-muted-2"
    >
      <circle cx="7" cy="7" r="2.5" />
      <path d="M7 1.2v1.4M7 11.4v1.4M1.2 7h1.4M11.4 7h1.4M2.7 2.7l1 1M10.3 10.3l1 1M2.7 11.3l1-1M10.3 3.7l1-1" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-muted-2"
    >
      <path d="M11.5 8.4A4.6 4.6 0 1 1 5.6 2.5a3.8 3.8 0 0 0 5.9 5.9z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-muted-2"
    >
      <path d="M5.5 2.5h-3v9h3" />
      <path d="M9 4.5 12 7l-3 2.5" />
      <path d="M12 7H6" />
    </svg>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string | null }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href as never}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 text-[13px] rounded text-left transition-colors",
        active
          ? "bg-paper-4 text-ink font-semibold shadow-card -ml-[14px] pl-6 rounded-r rounded-l-none [box-shadow:inset_2px_0_0_var(--teal-1),_var(--shadow-card)]"
          : "text-ink-2 hover:bg-ink/[0.04]"
      )}
    >
      <span className={cn("w-3.5 grid place-items-center", active ? "text-teal-1" : "text-muted-2")}>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

function DisabledNavLink({ item }: { item: NavItem }) {
  return (
    <span
      aria-disabled="true"
      title="Coming later"
      className="flex items-center gap-2.5 px-2.5 py-2 text-[13px] rounded text-left text-muted-2 cursor-not-allowed select-none"
    >
      <span className="w-3.5 grid place-items-center text-muted-2/70">{item.icon}</span>
      <span>{item.label}</span>
    </span>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
