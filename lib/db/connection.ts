/**
 * Postgres connection-string resolver for site-admin.
 *
 * Mirror of `site-app/lib/db/connection.ts` with one site-admin-
 * specific difference: returns `null` instead of throwing when no
 * connection info is available. site-admin renders a graceful
 * "configure DB" empty state on first-time local-dev runs rather
 * than crashing on import — preserving that behavior is the whole
 * reason this file isn't a copy-paste.
 *
 * Resolution order:
 *
 *   1. `DATABASE_URL` if set. Local dev (`.env.local`) and the
 *      Dockerfile's build-time placeholder both rely on this.
 *
 *   2. Build from discrete `PG*` env vars (`PGHOST`, `PGPORT`,
 *      `PGUSER`, `PGPASSWORD`, `PGDATABASE`) — the ECS-hosted path.
 *      ECS injects `PGPASSWORD` directly from the RDS-managed
 *      Secrets Manager secret on every task start, so password
 *      rotation lands invisibly: no SSM mirror, no manual update.
 *      The remaining PG vars come from the task definition's
 *      plaintext environment block. See
 *      `infra/envs/{dev,prod}/ecs.tf` for the wiring.
 *
 *   3. `null` if neither path is satisfied. Consumers treat this
 *      as "no data yet" and render an empty state.
 */

function urlEncodeComponent(value: string): string {
  return encodeURIComponent(value);
}

export function resolveConnectionString(): string | null {
  const direct = process.env.DATABASE_URL;
  if (direct && direct.length > 0) return direct;

  const host = process.env.PGHOST;
  const port = process.env.PGPORT ?? "5432";
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;

  // Strict: all four required pieces must be present. Partial PG*
  // sets (e.g., PGHOST but no PGPASSWORD) are a configuration bug
  // worth surfacing as "no DB" rather than constructing an obviously
  // broken URL that fails at first query.
  if (!host || !user || !password || !database) return null;

  return `postgres://${urlEncodeComponent(user)}:${urlEncodeComponent(password)}@${host}:${port}/${urlEncodeComponent(database)}`;
}
