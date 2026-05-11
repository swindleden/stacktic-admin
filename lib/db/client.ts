/**
 * Postgres client for site-admin.
 *
 * Single connection string: DATABASE_URL. Local dev points at the
 * postgres container; deployed envs point at the AWS RDS instance via
 * the db.stacktic.<tld> Route 53 alias.
 *
 * site-admin reads and writes directly. Most surfaces are read-only today,
 * but the operator console is allowed to correct data when needed. Defense-
 * in-depth sits at the auth layer (Stacktic Workspace SSO), not the DB role.
 * Schema migrations still happen only in site-app.
 *
 * Graceful no-config state: when DATABASE_URL isn't set we export `null`
 * so pages can render an empty "configure DB" state instead of crashing
 * on import. Useful for first-time local-dev runs.
 */
import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __stk_admin_pg_client: ReturnType<typeof postgres> | undefined;
}

function pickConnectionString(): string | null {
  return process.env.DATABASE_URL ?? null;
}

function makeClient(): ReturnType<typeof postgres> | null {
  const url = pickConnectionString();
  if (!url) return null;

  return postgres(url, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    // RDS presents a TLS cert valid for its AWS-generated hostname, but
    // we connect via the stable db.stacktic.<tld> Route 53 alias. The
    // hostname mismatch fails verify-full (postgres-js's default once
    // TLS is engaged). Disable cert chain verification — TLS still
    // encrypts, we just don't check the chain. Matches site-app's
    // lib/db/client.ts and the worker's pg.Pool config.
    ssl: { rejectUnauthorized: false },
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
