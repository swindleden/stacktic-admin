/**
 * Stacktic Admin — Tailwind config
 *
 * Same brand-locked palette as site-app. Default Tailwind palette is
 * intentionally NOT extended: contributors should reach for `bg-navy` /
 * `text-ink`, not `bg-slate-800`. If you need a shade that isn't here,
 * add a token first (see handoff/BRAND.md §Don't).
 */
import type { Config } from "tailwindcss";
import { stackticTheme } from "./tokens/tailwind.config.snippet";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  // Replace palette wholesale — no `extend.colors`. See BRAND.md §Don't.
  theme: stackticTheme,
  plugins: [],
};

export default config;
