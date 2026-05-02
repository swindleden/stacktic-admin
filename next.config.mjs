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

  env: {
    STACKTIC_ADMIN_URL: process.env.STACKTIC_ADMIN_URL ?? "http://localhost:3100",
  },

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
