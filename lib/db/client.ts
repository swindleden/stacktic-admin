/**
 * Postgres client for site-admin.
 *
 * Connection-string convention:
 *   DATABASE_URL         — primary, the only one we actually want set.
 *                          Locally points at Supabase containers (5432).
 *                          On Vercel points at Supavisor's pooler. The
 *                          web tier on Vercel uses the transaction pooler
 *                          (6543) because backstage is a stateless reader
 *                          under serverless concurrency; that's the right
 *                          shape for Vercel.
 *   DATABASE_URL_DIRECT  — DEPRECATED legacy fallback. Read for one
 *                          rename cycle so we don't break in-flight
 *                          deploys. Remove the fallback in a follow-up
 *                          once Vercel env vars are migrated.
 *
 * site-admin reads and writes directly. Most surfaces are read-only today,
 * but the operator console is allowed to correct data when needed. Defense-
 * in-depth sits at the auth layer (Stacktic Workspace SSO), not the DB role.
 * Schema migrations still happen only in site-app.
 *
 * Graceful no-config state: when neither URL is set we export `null` so
 * pages can render an empty "configure DB" state instead of crashing on
 * import. Useful for first-time local-dev runs and for previews.
 */
import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __stk_admin_pg_client: ReturnType<typeof postgres> | undefined;
}

function pickConnectionString(): string | null {
  // Prefer DATABASE_URL (the new canonical name). DATABASE_URL_DIRECT is
  // a transitional fallback — remove once env vars across all deploy
  // targets have been migrated.
  return (
    process.env.DATABASE_URL ?? process.env.DATABASE_URL_DIRECT ?? null
  );
}

function makeClient(): ReturnType<typeof postgres> | null {
  const url = pickConnectionString();
  if (!url) return null;

  return postgres(url, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    // prepare:false matches site-app's web-tier pattern. Safe in both pooled
    // and direct modes; required when DATABASE_URL points at the Supavisor
    // transaction pooler (6543). No measurable perf cost at our scale.
    prepare: false,
    types: {
      // Override postgres-js's default OID-1114 (`timestamp without time
      // zone`) parser. Default is `new Date(value)` where `value` is a
      // space-separated naive string like "2026-04-30 22:54:00.123" with
      // NO timezone suffix — JS treats that as LOCAL time and you get
      // "Updated in 6 hr" on a row written 6 minutes ago (Denny is on
      // EDT, ~4-hour offset rounds up to 6 in the relativeTime buckets).
      //
      // The columns store UTC wall-clock (Supabase server is UTC, `now()`
      // writes UTC), so we append 'Z' to force UTC parsing. Drizzle does
      // the equivalent via `mapFromDriverValue` for typed timestamp
      // columns; this catches the raw `sql` query path that bypasses
      // Drizzle, which is most of site-admin.
      //
      // Long-term fix is `timestamptz` columns (which return strings
      // with TZ suffix and parse correctly by default), but that's a
      // schema migration. This config-level override is the dogfood
      // patch.
      timestamp: {
        to: 1114,
        from: [1114],
        serialize: (x: unknown) =>
          x instanceof Date ? x.toISOString() : (x as string),
        parse: (x: string) =>
          new Date(/Z$|[+-]\d\d:?\d\d$/.test(x) ? x : x + "Z"),
      },
    },
  });
}

const client =
  globalThis.__stk_admin_pg_client ?? makeClient() ?? null;

if (process.env.NODE_ENV !== "production" && client) {
  globalThis.__stk_admin_pg_client = client;
}

/**
 * Tagged-template SQL client. `null` when no DATABASE_URL is configured —
 * callers should treat null as "no data" and render an empty state.
 */
export const sql = client;

/** True when a connection string was found at boot. */
export const dbConfigured = client !== null;
