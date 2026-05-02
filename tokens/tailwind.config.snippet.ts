/**
 * Stacktic — Tailwind theme (Backstage)
 *
 * Replaces the palette wholesale with the Backstage handoff token names.
 * All chrome flips with [data-theme="dark"] via CSS variables in tokens.css
 * (Midnight palette). Component code is theme-agnostic — write `bg-paper`,
 * `text-ink`, `bg-teal-1/10` and the right values render in either theme.
 *
 * Color shape:
 *  • Solid var-backed: `paper`, `surface`, `sidebar`, `border` — plain
 *    `var(--xxx)`. Cheap, no opacity modifiers.
 *  • RGB-triplet var-backed: `ink`, `teal`, `teal-1`, `teal-2`, `mint`,
 *    `amber`, `danger`, `muted` — `rgb(var(--xxx-rgb) / <alpha-value>)`.
 *    Use these when you need `bg-teal-1/10`, `text-ink/60`, etc.
 *  • Hex constants: `white`, `black`, `info`. Don't flip with theme.
 *
 * Back-compat:
 *  Legacy semantic names (`bg`, `surface`, `slate`, `heading`, `link`,
 *  `success`/`warning`/`critical`, `navy`) stay defined so pages that
 *  haven't been restyled yet still build. They map onto the Backstage
 *  palette and flip with theme. Remove these once every route is on
 *  Backstage primitives.
 */

import type { Config } from "tailwindcss";

export const stackticTheme: Partial<Config["theme"]> = {
  colors: {
    transparent: "transparent",
    current: "currentColor",
    inherit: "inherit",
    white: "#FFFFFF",
    black: "#000000",

    /* ── Backstage palette — primary names. ── */
    paper: {
      DEFAULT: "rgb(var(--paper-rgb) / <alpha-value>)",
      2: "var(--paper-2)",
      3: "var(--paper-3)",
      4: "var(--paper-4)",
    },
    ink: {
      DEFAULT: "rgb(var(--ink-rgb) / <alpha-value>)",
      2: "rgb(var(--ink-2-rgb) / <alpha-value>)",
    },
    muted: {
      DEFAULT: "rgb(var(--muted-rgb) / <alpha-value>)",
      2: "var(--muted-2)",
      light: "var(--muted-2)",  // back-compat alias
    },
    teal: {
      DEFAULT: "rgb(var(--teal-rgb) / <alpha-value>)",
      1: "rgb(var(--teal-1-rgb) / <alpha-value>)",
      2: "rgb(var(--teal-2-rgb) / <alpha-value>)",
      deep: "var(--teal-deep)",
      soft: "var(--teal-soft)",
      400: "var(--teal-2)",
      500: "var(--teal-1)",
      600: "var(--teal)",
    },
    mint: "rgb(var(--mint-rgb) / <alpha-value>)",
    amber: {
      DEFAULT: "rgb(var(--amber-rgb) / <alpha-value>)",
      tint: "var(--amber-tint)",
    },
    danger: {
      DEFAULT: "rgb(var(--danger-rgb) / <alpha-value>)",
      tint: "var(--danger-tint)",
    },
    line: {
      DEFAULT: "var(--line)",
      soft: "var(--line-soft)",
      strong: "var(--line-strong)",
    },

    /* ── Back-compat aliases for not-yet-restyled pages. ── */
    bg: {
      DEFAULT: "var(--bg)",
      warm: "var(--bg-warm)",
    },
    surface: {
      DEFAULT: "var(--surface)",
      subtle: "var(--surface-subtle)",
      elevated: "var(--surface-elevated)",
    },
    sidebar: "var(--sidebar)",
    border: {
      DEFAULT: "var(--border)",
      soft: "var(--border-soft)",
      strong: "var(--border-strong)",
    },
    slate: "var(--text)",
    heading: "var(--heading)",
    navy: {
      DEFAULT: "var(--ink)",
      900: "var(--ink)",
      800: "var(--ink-2)",
      700: "var(--ink-2)",
      600: "var(--muted)",
    },
    link: "var(--link)",

    /* ── Severity — var-backed so soft/text/border flip with theme. ── */
    success: {
      DEFAULT: "var(--success)",
      soft: "var(--success-soft)",
      text: "var(--success-text)",
      border: "var(--success-border)",
    },
    warning: {
      DEFAULT: "var(--warning)",
      soft: "var(--warning-soft)",
      text: "var(--warning-text)",
      border: "var(--warning-border)",
    },
    critical: {
      DEFAULT: "var(--critical)",
      soft: "var(--critical-soft)",
      text: "var(--critical-text)",
      border: "var(--critical-border)",
    },
    info: "#3BAFDA",
  },

  fontFamily: {
    sans:  ["var(--font-sans)"],
    mono:  ["var(--font-mono)"],
    serif: ["var(--font-serif)"],
  },

  extend: {
    /* Backstage type scale — pin these instead of guessing. Default Tailwind
       sizes (text-xs/sm/base/lg/xl/2xl) remain available for back-compat. */
    fontSize: {
      "label":   ["10.5px", { letterSpacing: "0.1em",   lineHeight: "1.2" }],
      "meta":    ["11.5px", { letterSpacing: "0.005em", lineHeight: "1.3" }],
      "mono-sm": ["12px",   { letterSpacing: "0",       lineHeight: "1.4" }],
      "mono-md": ["12.5px", { letterSpacing: "0",       lineHeight: "1.4" }],
      "body":    ["13.5px", { letterSpacing: "-0.005em",lineHeight: "1.55" }],
      "h2":      ["22px",   { letterSpacing: "-0.015em",lineHeight: "1" }],
      "kpi":     ["32px",   { letterSpacing: "-0.025em",lineHeight: "1" }],
      "h1":      ["36px",   { letterSpacing: "-0.015em",lineHeight: "1" }],
    },
    borderRadius: {
      sm: "4px",
      DEFAULT: "6px",
      md: "8px",
      lg: "10px",
      xl: "14px",
      "2xl": "20px",
    },
    boxShadow: {
      card:        "var(--shadow-card)",
      "stk-sm":    "var(--shadow-card)",
      "stk-md":    "var(--shadow-md)",
      "stk-lg":    "var(--shadow-lg)",
      "glow-mint": "var(--glow-teal)",
      "glow-teal": "var(--glow-teal)",
    },
    letterSpacing: {
      tightish: "-0.005em",
      snug:     "-0.015em",
      tight3:   "-0.03em",
    },
  },
};
