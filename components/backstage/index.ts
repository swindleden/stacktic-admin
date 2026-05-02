/**
 * Stacktic Backstage primitives — barrel export.
 *
 * Convention: import from "@/components/backstage" everywhere; reach into
 * individual files only when tree-shaking matters or you're inside this
 * folder. Keeps page imports terse and refactors safe.
 */

export * from "./cn";
export * from "./primitives";
export * from "./data";
export * from "./panels";
export * from "./shell";
