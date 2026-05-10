/**
 * Stacktic Admin — Next.js config
 *
 * Operator console for the Stacktic team. Runs separately from the
 * customer-facing app (site-app). No edge runtime: all API routes
 * run on Node so they can talk to Postgres directly when needed.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,

  // STACKTIC_ADMIN_URL is read at runtime via process.env directly.
  // Don't put it in next.config's `env` block — that block inlines values
  // into both client AND server bundles at BUILD time, which means a
  // Docker image built without the right STACKTIC_ADMIN_URL bakes in
  // localhost:3100 and ignores whatever ECS sets at runtime. Same fix
  // as site-app/next.config.mjs's STACKTIC_APP_URL handling.

  // Health check must respond inline. No caching.
  async headers() {
    return [
      {
        source: "/api/health",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
