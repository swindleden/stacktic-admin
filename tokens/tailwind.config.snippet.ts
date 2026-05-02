/**
 * Stacktic — Tailwind config snippet
 *
 * Merge into your tailwind.config.ts. Overrides the default palette
 * and extends the theme with Stacktic's tokens. Disabling the default
 * palette is intentional: it prevents contributors from reaching for
 * `blue-500` / `gray-800` / etc. when they should be using a token.
 *
 * ────────────────────────────────────────────────────────────────
 * Dark mode convention (read before adding new UI):
 *
 *  • Chrome tokens (bg, surface, sidebar, border, muted, slate,
 *    heading, etc.) are backed by CSS custom properties that flip
 *    under [data-theme="dark"] — see tokens/tokens.css. Use these
 *    for anything describing a surface, border, or neutral text.
 *    They get dark mode for free.
 *
 *  • Brand tokens (navy, teal, ink, mint, paper) stay hex. They are
 *    intentional anchors that don't swap with theme — primary CTAs,
 *    marketing surfaces, logo fills.
 *
 *  • Severity tokens (success/warning/critical) ARE var-backed. The
 *    signal meaning is tied to the hue, but a cream `warning-soft`
 *    banner on a dark surface reads as a bug, not a signal. Light
 *    and dark values both come from handoff/mockups/.
 *
 *  • Need a shade that isn't here? Add a token first (BRAND.md §Don't).
 *    Prefer var-backed chrome over a new hex unless the value is
 *    explicitly meant to stay constant in both themes.
 * ────────────────────────────────────────────────────────────────
 */

import type { Config } from "tailwindcss";

export const stackticTheme: Partial<Config["theme"]> = {
  // Replace the palette entirely. Use `colors: { ... }` (not `extend.colors`)
  // so defaults don't bleed in. Tokens below mirror tokens.css and the app
  // mockups at handoff/mockups/.
  colors: {
    transparent: "transparent",
    current: "currentColor",
    white: "#FFFFFF",
    black: "#000000",

    // ── Brand core — stays hex. Don't flip in dark mode. ──
    // App chrome uses these for logo fills, primary buttons, and
    // intentional brand anchors. For headings that should flip with
    // theme, reach for `text-heading` instead.
    ink: "#0B1220",
    navy: {
      DEFAULT: "#111B2E",
      700: "#17233F",
      600: "#1F3357",
      800: "#111B2E",
      900: "#0B1220",
    },
    teal: {
      DEFAULT: "#2FA29A",
      600: "#1F7A7A",
      500: "#2FA29A",
      400: "#4FC7BC",
      deep: "var(--teal-deep)",   // flips dark — active-nav count text
      soft: "var(--teal-soft)",   // flips dark — active-nav count bg
    },
    mint: "#7FE0D3",
    paper: {
      // Warm brand paper — retained for marketing contexts. App chrome uses
      // `bg` / `surface` / `sidebar` below (cool palette per mockup).
      DEFAULT: "#F4F1EA",
      2: "#EAE6DC",
    },

    // ── App chrome — var-backed. These flip under [data-theme="dark"]. ──
    // `bg` drives the body background behind content. `surface` is cards.
    // `sidebar` is the chrome panel on the left. `bg-warm` is hover/tinted row.
    // `surface.elevated` is for pills/pinned chips that sit above cards
    // (in light it's the same white as surface; in dark it lifts above the
    // base surface to create hierarchy).
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

    // Borders — three weights so we can match the mockup's card vs divider
    // vs emphasised border distinction.
    border: {
      DEFAULT: "var(--border)",
      soft: "var(--border-soft)",
      strong: "var(--border-strong)",
    },

    muted: {
      DEFAULT: "var(--muted)",
      light: "var(--muted-light)",
    },
    // App body text. Mockup body copy uses #0F172A in light, #E5E7EB in
    // dark — both resolved via `var(--text)`. Use `slate` for body copy.
    slate: "var(--text)",
    // Heading color — flips navy (light) ↔ near-white (dark). Use this
    // in place of `text-navy` for section titles and page H1s in app chrome.
    heading: "var(--heading)",

    // Dark-mode surfaces (legacy — kept for components that were already
    // using `dark:` utilities against light tokens. New code should prefer
    // the var-backed chrome tokens above and skip `dark:` entirely.)
    dark: {
      bg: "#0F1A2E",
      surface: "#15213A",
      sidebar: "#0A1120",
      warm: "#253456",
      text: "#E6ECF5",
      muted: "#8C9BB5",
    },

    // ── Semantic severity — var-backed so soft/text (and the base hue) can
    // flip between themes. Light values match the old frozen hexes; dark
    // values come from handoff/mockups/mockup_tools_dark.html (low-alpha
    // tint for `.soft`, bright variant for the hue and text). Chrome usage
    // (banners, pills, chips) gets dark mode for free; no `dark:` variants.
    success: {
      DEFAULT: "var(--success)",
      soft: "var(--success-soft)",
      text: "var(--success-text)",
      // `border` exists because Tailwind can't compute `/alpha` modifiers
      // on var-backed colors without the `<alpha-value>` placeholder. Prefer
      // `border-success-border` over `border-success/30` — the former flips
      // per theme, the latter renders as the default border color.
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

  extend: {
    fontFamily: {
      sans: ['"IBM Plex Sans"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
    },
    borderRadius: {
      sm: "6px",
      md: "10px",
      lg: "14px",
      xl: "20px",
    },
    // Shadows are var-backed so the dark-mode override in tokens.css
    // kicks in automatically.
    boxShadow: {
      "stk-sm":   "var(--stk-shadow-sm)",
      "stk-md":   "var(--stk-shadow-md)",
      "stk-lg":   "var(--stk-shadow-lg)",
      "glow-teal": "var(--stk-glow-teal)",
    },
    letterSpacing: {
      tightish: "-0.005em",
      snug:     "-0.015em",
      tight3:   "-0.03em",
    },
  },
};

// Usage (in your tailwind.config.ts):
//
//   import type { Config } from "tailwindcss";
//   import { stackticTheme } from "./tokens/tailwind.config.snippet";
//
//   export default {
//     content: ["./app/**\/*.{ts,tsx}", "./components/**\/*.{ts,tsx}"],
//     darkMode: ["class", '[data-theme="dark"]'],
//     theme: stackticTheme,
//     plugins: [],
//   } satisfies Config;
