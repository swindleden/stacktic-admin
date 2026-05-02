/**
 * Stacktic — Design Tokens v2 (Backstage)
 * Mirror of tokens.css for runtime use (charts, canvas, inline SVG, meta).
 * For CSS styling, prefer tokens.css custom properties so theme flips work.
 */

export const tokens = {
  color: {
    /* Surfaces (light) */
    paper:    "#FAF7F0",
    paper2:   "#F1EDE3",
    paper3:   "#FDFBF6",
    paper4:   "#FFFFFE",

    /* Text (light) */
    ink:      "#0B1220",
    ink2:     "#3F4A60",
    muted:    "#5A6A82",
    muted2:   "#8A95AB",

    /* Brand */
    teal:     "#1F7A7A",
    teal1:    "#2FA29A",
    teal2:    "#4FC7BC",
    mint:     "#7FE0D3",

    /* Status */
    amber:    "#C97B3F",
    danger:   "#B23B2D",

    /* Lines */
    line:        "rgba(13, 23, 38, 0.08)",
    lineSoft:    "rgba(13, 23, 38, 0.04)",
    lineStrong:  "rgba(13, 23, 38, 0.14)",

    /* Severity (back-compat for chart helpers, etc.) */
    success:   "#1FA06E",
    warning:   "#C97B3F",
    critical:  "#B23B2D",

    /* Legacy alias — layout.tsx themeColor still references these. */
    navy:     "#0B1220",
    white:    "#FFFFFF",
  },

  /* Midnight palette — for runtime callers that need the dark hex. */
  dark: {
    paper:    "#0F141C",
    paper2:   "#0B1018",
    paper3:   "#161D28",
    paper4:   "#1A2330",
    ink:      "#ECEAE3",
    ink2:     "#B4BAC6",
    muted:    "#7E889A",
    muted2:   "#5A6478",
    teal:     "#4FC7BC",
    mint:     "#7FE0D3",
    amber:    "#E0A36A",
  },

  font: {
    sans:  '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono:  '"Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
    serif: '"Instrument Serif", "Times New Roman", serif',
  },

  radius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 10,
  },

  space: {
    1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 56, 10: 80,
  },

  shadow: {
    card: "0 1px 2px rgba(13, 23, 38, 0.04)",
    md:   "0 4px 14px rgba(13, 23, 38, 0.06)",
    lg:   "0 12px 32px rgba(13, 23, 38, 0.10)",
    glowMint: "0 0 12px rgba(127, 224, 211, 0.35)",
  },
} as const;

export type Tokens = typeof tokens;
