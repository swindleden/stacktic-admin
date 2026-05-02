import * as React from "react";
import { cn } from "./cn";

/* ─────────────────────────────────────────────────────────────
 * Button — primary / default / ghost / danger
 * ───────────────────────────────────────────────────────────── */

type ButtonVariant = "default" | "primary" | "ghost" | "danger";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const buttonBase =
  "inline-flex items-center gap-2 px-3 py-1.5 rounded font-sans text-[12.5px] font-medium tracking-[-0.005em] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

// Primary CTA flips treatment per theme. Light mode uses the dark-on-light
// "ink button" — high-contrast solid, the dominant element on the page.
// Dark mode swaps to teal-1 with the brand glow shadow per the palette
// decision log: "Teal gradient + shadow-glow = primary CTA (dark mode
// only — the 🔥 moment)". Without this dark-mode override the button
// would render as a near-white fill (because `--ink` flips to a warm
// off-white in dark), which is loud but off-brand. The glow comes from
// the `--glow-teal` token so it tracks any brand changes there.
const buttonVariants: Record<ButtonVariant, string> = {
  default: "bg-paper-4 border border-line-strong text-ink hover:bg-paper-3",
  primary:
    "bg-ink text-paper border border-ink hover:bg-ink/90 " +
    "dark:bg-teal-1 dark:text-paper dark:border-teal-1 dark:hover:bg-teal-2 " +
    "dark:shadow-[var(--glow-teal)]",
  ghost:   "bg-transparent border border-transparent text-muted hover:text-ink hover:bg-paper-3",
  danger:  "bg-paper-4 border border-danger/30 text-danger hover:bg-danger-tint",
};

export function Button({ variant = "default", className, ...rest }: ButtonProps) {
  return <button className={cn(buttonBase, buttonVariants[variant], className)} {...rest} />;
}

/* ─────────────────────────────────────────────────────────────
 * Pill — status indicator with colored dot
 * Extra kinds added beyond the handoff to cover existing
 * lifecycle/problem/job states. Keep semantics consistent:
 * green=healthy, amber=needs attention, red=broken, neutral=info.
 * ───────────────────────────────────────────────────────────── */

export type PillKind =
  | "active"
  | "trial"
  | "stalled"
  | "suspended"
  | "canceled"
  | "onboarding"
  | "published"
  | "draft"
  | "deprecated"
  | "open"
  | "resolved"
  | "ignored"
  | "running"
  | "queued"
  | "failed"
  | "succeeded"
  | "neutral";

interface PillStyle { bg: string; text: string; dot: string; ring?: string }

// Pill bg tints get a `dark:` bump from /10 to /15 (and amber/danger
// from .12/.10 to ~.20). The light-mode tints are tuned for warm-cream
// surfaces; on dark navy surfaces those same opacities read too soft
// to register as "this is a status indicator." Bump nudges them into
// readability without losing the chrome-not-content character.
const pillStyles: Record<PillKind, PillStyle> = {
  active:     { bg: "bg-teal-1/10 dark:bg-teal-1/15",  text: "text-teal",   dot: "bg-teal-1",  ring: "ring-2 ring-teal-1/20" },
  published:  { bg: "bg-teal-1/10 dark:bg-teal-1/15",  text: "text-teal",   dot: "bg-teal-1" },
  succeeded:  { bg: "bg-teal-1/10 dark:bg-teal-1/15",  text: "text-teal",   dot: "bg-teal-1" },
  resolved:   { bg: "bg-teal-1/10 dark:bg-teal-1/15",  text: "text-teal",   dot: "bg-teal-1" },
  running:    { bg: "bg-teal-1/10 dark:bg-teal-1/15",  text: "text-teal",   dot: "bg-teal-1",  ring: "ring-2 ring-teal-1/20" },

  trial:      { bg: "bg-ink/[0.06] dark:bg-ink/[0.10]", text: "text-ink-2",  dot: "bg-muted" },
  draft:      { bg: "bg-ink/[0.06] dark:bg-ink/[0.10]", text: "text-ink-2",  dot: "bg-muted-2" },
  onboarding: { bg: "bg-ink/[0.06] dark:bg-ink/[0.10]", text: "text-ink-2",  dot: "bg-muted" },
  queued:     { bg: "bg-ink/[0.06] dark:bg-ink/[0.10]", text: "text-ink-2",  dot: "bg-muted-2" },
  ignored:    { bg: "bg-ink/[0.06] dark:bg-ink/[0.10]", text: "text-ink-2",  dot: "bg-muted-2" },
  neutral:    { bg: "bg-ink/[0.06] dark:bg-ink/[0.10]", text: "text-ink-2",  dot: "bg-muted-2" },

  stalled:    { bg: "bg-amber-tint dark:bg-amber/20", text: "text-amber",  dot: "bg-amber" },
  open:       { bg: "bg-amber-tint dark:bg-amber/20", text: "text-amber",  dot: "bg-amber" },
  deprecated: { bg: "bg-amber-tint dark:bg-amber/20", text: "text-amber",  dot: "bg-amber" },

  suspended:  { bg: "bg-danger/10 dark:bg-danger/20",  text: "text-danger", dot: "bg-danger" },
  canceled:   { bg: "bg-ink/[0.06] dark:bg-ink/[0.10]", text: "text-muted",  dot: "bg-muted-2" },
  failed:     { bg: "bg-danger/10 dark:bg-danger/20",  text: "text-danger", dot: "bg-danger" },
};

export function Pill({ kind = "neutral", children, className }: {
  kind?: PillKind; children: React.ReactNode; className?: string;
}) {
  const s = pillStyles[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium tracking-[0.02em]",
        s.bg, s.text, className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot, s.ring)} />
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
 * SearchInput — controlled wrapper. Pass `value` + `onChange`
 * for client-side, or wrap in a <form> for server-side submit.
 * ───────────────────────────────────────────────────────────── */

export function SearchInput({
  placeholder = "Search…",
  shortcut = "⌘K",
  className,
  value,
  defaultValue,
  onChange,
  name,
}: {
  placeholder?: string;
  shortcut?: string | null;
  className?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  name?: string;
}) {
  return (
    <label className={cn(
      "flex items-center gap-2 bg-paper-4 border border-line rounded px-3 py-1.5 w-[280px] text-[13px] text-muted",
      // `--line` in dark is rgba(255,255,255,0.06) — barely visible on
      // small surfaces. Inputs benefit from `--line-strong` (10%) at
      // rest in dark mode so the boundary reads cleanly.
      "dark:border-line-strong",
      "focus-within:border-line-strong",
      className
    )}>
      <span className="opacity-55">⌕</span>
      <input
        name={name}
        className="flex-1 bg-transparent outline-none text-ink placeholder:text-muted"
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => onChange?.(e.target.value)}
      />
      {shortcut && (
        <kbd className="font-mono text-[10px] text-muted-2 bg-paper-2 border border-line rounded-sm px-1.5 py-px">
          {shortcut}
        </kbd>
      )}
    </label>
  );
}

/* ─────────────────────────────────────────────────────────────
 * SelectTrigger — display-only trigger; wire to your dropdown of choice
 * ───────────────────────────────────────────────────────────── */

export function SelectTrigger({ children, className, ...rest }: {
  children: React.ReactNode; className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 bg-paper-4 border border-line rounded px-3 py-1.5 font-mono text-[12.5px] text-ink-2",
        "hover:bg-paper-3",
        className
      )}
      {...rest}
    >
      {children}
      <span className="text-muted-2">⌄</span>
    </button>
  );
}
