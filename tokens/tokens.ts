/**
 * Stacktic — Design Tokens v1.0
 * Generated from brand/Brand Guidelines.html (authoritative)
 *
 * Import when you need a hex value at runtime (charts, canvas, inline SVG).
 * For CSS styling, prefer tokens.css custom properties.
 */

export const tokens = {
  color: {
    ink:       "#0B1220",
    navy:      "#111B2E",
    navy2:     "#17233F",
    navy3:     "#1F3357",
    teal: {
      600: "#1F7A7A",
      500: "#2FA29A",
      400: "#4FC7BC",
    },
    mint:      "#7FE0D3",
    paper:     "#F4F1EA",
    paper2:    "#EAE6DC",
    white:     "#FFFFFF",
    muted:     "#5A6A82",
    line:         "rgba(13, 23, 38, 0.08)",
    lineStrong:   "rgba(13, 23, 38, 0.14)",

    // Semantic severity — NOT brand colors
    success:   "#1FA06E",
    warning:   "#C89A4A",
    critical:  "#C44D4D",
  },

  // Dark-mode surface tokens — named so you can reach them for charts etc.
  dark: {
    bg:          "#0F1A2E",
    bgElevated:  "#15213A",
    surface:     "#15213A",
    surfaceWarm: "#253456",
    sidebar:     "#0A1120",
    text:        "#E6ECF5",
    textMuted:   "#8C9BB5",
  },

  font: {
    sans:  '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    mono:  '"IBM Plex Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },

  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
  },

  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 32,
    8: 40,
    9: 56,
    10: 80,
  },

  shadow: {
    sm: "0 1px 2px rgba(11, 18, 32, 0.04)",
    md: "0 4px 12px rgba(11, 18, 32, 0.06), 0 1px 2px rgba(11, 18, 32, 0.04)",
    lg: "0 12px 32px rgba(11, 18, 32, 0.10), 0 2px 6px rgba(11, 18, 32, 0.06)",
    glowTeal: "0 0 0 1px rgba(79, 199, 188, 0.35), 0 6px 24px rgba(79, 199, 188, 0.28)",
  },
} as const;

export type Tokens = typeof tokens;
