/**
 * graphile-worker queries for the operator console.
 *
 * Reads three views into the worker queue:
 *
 *   1. Per-task summary  — counts grouped by `task_identifier`, bucketed
 *      into mutually-exclusive states (Pending, Scheduled, Running, Dead)
 *      plus an overlapping "Errored" indicator.
 *
 *   2. Named-queue locks — one row per `job_queues` entry. graphile-worker
 *      takes an exclusive lock per named queue so jobs in the queue run
 *      serially. A worker that crashes mid-job (or laptop sleep) leaves
 *      a stale lock that blocks subsequent workers from picking up jobs
 *      in that queue, even when the jobs themselves are unlocked.
 *
 *   3. Recent failures   — last N rows where `last_error IS NOT NULL`,
 *      ordered by id desc. Powers the "what's failing right now" feed.
 *
 * Schema notes (graphile-worker 0.16+):
 *   - `graphile_worker.jobs` is a VIEW joining `_private_jobs` with
 *     `_private_tasks` (for `task_identifier`) and `_private_job_queues`
 *     (for `queue_name`). Use the view; we never query `_private_jobs`
 *     directly so the join changes don't bite us on upgrade.
 *   - `graphile_worker._private_job_queues` is the queue table itself.
 *     There's no public view; that name is current as of 0.16.6.
 *   - `is_available` on a job = `locked_at IS NULL AND attempts < max_attempts`.
 *     We don't reach for the column directly — buckets below derive the
 *     same logic from raw columns so the SQL stays portable across versions.
 */
import { sql } from "../client";

// ── Types ─────────────────────────────────────────────────────────────────

/**
 * Mutually-exclusive job states. A single job is in exactly one of
 * Pending / Scheduled / Running / Dead. Errored is an overlapping
 * indicator (a job in backoff after a failed attempt is both
 * Scheduled and Errored).
 */
export interface JobsTaskSummaryRow {
  taskIdentifier: string;
  total: number;
  /** run_at <= now, not locked, not dead — ready to pick up immediately. */
  pending: number;
  /** run_at > now, not locked, not dead — usually exponential backoff
   *  after a failed attempt, sometimes a future-scheduled job. */
  scheduled: number;
  /** Currently locked by a worker. */
  running: number;
  /** attempts >= max_attempts; the worker has given up. */
  dead: number;
  /** last_error IS NOT NULL. Overlaps with Pending / Scheduled / Running. */
  errored: number;
}

export interface JobsQueueLockRow {
  queueName: string;
  lockedAt: Date | null;
  lockedBy: string | null;
  /** Total jobs currently associated with this queue (any state). */
  jobCount: number;
}

export interface JobsRecentFailureRow {
  id: number;
  taskIdentifier: string;
  queueName: string | null;
  attempts: number;
  maxAttempts: number;
  lastError: string;
  runAt: Date;
  lockedAt: Date | null;
  updatedAt: Date;
}

// ── Queries ───────────────────────────────────────────────────────────────

/**
 * One row per task_identifier with state-bucket counts. Empty array when
 * no jobs are queued AND no jobs have ever run (the view goes empty
 * after a worker drains everything successfully — that's by design).
 */
export async function getJobsTaskSummary(): Promise<JobsTaskSummaryRow[]> {
  if (!sql) return [];

  const rows = await sql<
    {
      task_identifier: string;
      total: string;
      pending: string;
      scheduled: string;
      running: string;
      dead: string;
      errored: string;
    }[]
  >`
    select
      task_identifier,
      count(*)::text as total,
      count(*) filter (
        where locked_at is null
          and attempts < max_attempts
          and run_at <= now()
      )::text as pending,
      count(*) filter (
        where locked_at is null
          and attempts < max_attempts
          and run_at > now()
      )::text as scheduled,
      count(*) filter (where locked_at is not null)::text as running,
      count(*) filter (
        where attempts >= max_attempts and locked_at is null
      )::text as dead,
      count(*) filter (where last_error is not null)::text as errored
    from graphile_worker.jobs
    group by task_identifier
    order by task_identifier asc
  `;

  return rows.map((r) => ({
    taskIdentifier: r.task_identifier,
    total: Number(r.total),
    pending: Number(r.pending),
    scheduled: Number(r.scheduled),
    running: Number(r.running),
    dead: Number(r.dead),
    errored: Number(r.errored),
  }));
}

/**
 * One row per named queue with its lock state and a job count.
 *
 * Stale-lock detection happens at the call site (compare `lockedAt`
 * against a "stale threshold" — default we render against is 5 minutes,
 * tunable per UI surface).
 */
export async function getJobsQueueLocks(): Promise<JobsQueueLockRow[]> {
  if (!sql) return [];

  const rows = await sql<
    {
      queue_name: string;
      locked_at: Date | null;
      locked_by: string | null;
      job_count: string;
    }[]
  >`
    select
      q.queue_name,
      q.locked_at,
      q.locked_by,
      count(j.id)::text as job_count
    from graphile_worker._private_job_queues q
    left join graphile_worker.jobs j on j.queue_name = q.queue_name
    group by q.queue_name, q.locked_at, q.locked_by
    order by q.queue_name asc
  `;

  return rows.map((r) => ({
    queueName: r.queue_name,
    lockedAt: r.locked_at,
    lockedBy: r.locked_by,
    jobCount: Number(r.job_count),
  }));
}

/**
 * Most-recent N jobs that hit `last_error`. Ordered by id desc — id is
 * monotonically increasing so this naturally surfaces the newest
 * failures first. `lastError` is the raw error message stored by
 * graphile-worker; can include stack traces. Truncate at the call
 * site if needed.
 */
export async function getJobsRecentFailures(
  limit: number = 50,
): Promise<JobsRecentFailureRow[]> {
  if (!sql) return [];

  const rows = await sql<
    {
      id: string;
      task_identifier: string;
      queue_name: string | null;
      attempts: number;
      max_attempts: number;
      last_error: string;
      run_at: Date;
      locked_at: Date | null;
      updated_at: Date;
    }[]
  >`
    select
      id::text,
      task_identifier,
      queue_name,
      attempts,
      max_attempts,
      last_error,
      run_at,
      locked_at,
      updated_at
    from graphile_worker.jobs
    where last_error is not null
    order by id desc
    limit ${limit}
  `;

  return rows.map((r) => ({
    id: Number(r.id),
    taskIdentifier: r.task_identifier,
    queueName: r.queue_name,
    attempts: r.attempts,
    maxAttempts: r.max_attempts,
    lastError: r.last_error,
    runAt: r.run_at,
    lockedAt: r.locked_at,
    updatedAt: r.updated_at,
  }));
}
