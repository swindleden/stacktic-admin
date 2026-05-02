"use server";

/**
 * Operator actions on the graphile-worker queue.
 *
 * Four sharp tools, each gated behind a confirm dialog at the call site.
 * Site-admin runs locally + unauthenticated; the only "auth" is "you
 * have a shell on the machine running the admin app." That's the
 * existing trust model — see lib/db/client.ts for the longer note.
 *
 * Every action returns the same shape:
 *
 *   { ok: true,  message: "...", affected: <count> }
 *   { ok: false, message: "..." }
 *
 * The action handlers do NOT call revalidatePath — the client component
 * uses `router.refresh()` after a successful action so the UI re-reads
 * the current state. Keeps the actions pure SQL.
 *
 * Stale-lock threshold is 5 minutes for the queue + job unlocks. A
 * worker that's been holding a lock for 5+ minutes is either dead or
 * processing a job that's already past the worker's gracefulShutdown
 * window — either way, taking the lock is safe.
 */
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db/client";

export interface JobActionResult {
  ok: boolean;
  message: string;
  affected?: number;
}

const STALE_LOCK_INTERVAL = "5 minutes";

function notConfigured(): JobActionResult {
  return {
    ok: false,
    message: "Database not configured — set DATABASE_URL_DIRECT in .env.local.",
  };
}

/**
 * Clear the queue-level lock if it's older than 5 minutes. The named
 * queue gets re-claimed by the next worker tick. Does NOT touch job
 * locks; those are handled separately.
 *
 * Safe even if the worker that holds the lock is still alive — the
 * worker will reclaim the queue via a normal LISTEN/NOTIFY tick. The
 * only "danger" is two workers briefly believing they own the same
 * queue, which graphile-worker handles correctly.
 */
export async function forceUnlockQueue(
  queueName: string,
): Promise<JobActionResult> {
  if (!sql) return notConfigured();

  console.info("[backstage] forceUnlockQueue", { queueName });

  const rows = await sql<{ id: number }[]>`
    update graphile_worker._private_job_queues
    set locked_at = null, locked_by = null
    where queue_name = ${queueName}
      and locked_at is not null
      and locked_at < now() - ${STALE_LOCK_INTERVAL}::interval
    returning id
  `;

  revalidatePath("/jobs");
  return {
    ok: true,
    affected: rows.length,
    message:
      rows.length > 0
        ? `Cleared lock on queue "${queueName}".`
        : `No stale lock on "${queueName}" (lock held for less than 5 minutes, or already free).`,
  };
}

/**
 * Clear job-level locks older than 5 minutes for a given task. These
 * jobs were "running" at the moment a worker died; without this the
 * locks expire on graphile-worker's own ~4-hour timeout.
 */
export async function forceUnlockJobs(
  taskIdentifier: string,
): Promise<JobActionResult> {
  if (!sql) return notConfigured();

  console.info("[backstage] forceUnlockJobs", { taskIdentifier });

  const rows = await sql<{ id: number }[]>`
    update graphile_worker._private_jobs
    set locked_at = null, locked_by = null
    where task_id = (
      select id from graphile_worker._private_tasks
      where identifier = ${taskIdentifier}
    )
      and locked_at is not null
      and locked_at < now() - ${STALE_LOCK_INTERVAL}::interval
    returning id
  `;

  revalidatePath("/jobs");
  return {
    ok: true,
    affected: rows.length,
    message:
      rows.length > 0
        ? `Cleared ${rows.length} stale job lock(s) for "${taskIdentifier}".`
        : `No stale job locks for "${taskIdentifier}".`,
  };
}

/**
 * Pull every backed-off job for a task forward to `run_at = now()`.
 * Useful when you've fixed the underlying cause (e.g. an API outage)
 * and want to flush the queue without waiting through exponential
 * backoff. Doesn't touch dead or running jobs.
 */
export async function runErroredNow(
  taskIdentifier: string,
): Promise<JobActionResult> {
  if (!sql) return notConfigured();

  console.info("[backstage] runErroredNow", { taskIdentifier });

  const rows = await sql<{ id: number }[]>`
    update graphile_worker._private_jobs
    set run_at = now(), updated_at = now()
    where task_id = (
      select id from graphile_worker._private_tasks
      where identifier = ${taskIdentifier}
    )
      and last_error is not null
      and locked_at is null
      and attempts < max_attempts
      and run_at > now()
    returning id
  `;

  revalidatePath("/jobs");
  return {
    ok: true,
    affected: rows.length,
    message:
      rows.length > 0
        ? `Pulled ${rows.length} backed-off job(s) for "${taskIdentifier}" forward.`
        : `Nothing to do — no backed-off jobs for "${taskIdentifier}".`,
  };
}

/**
 * Reset dead jobs (attempts >= max_attempts) for a task back to
 * attempts=0 + last_error=null, scheduled to run immediately. Use this
 * when the failure cause is fixed and you want a second shot at the
 * jobs that ran out of attempts during the outage.
 */
export async function reEnqueueDeadJobs(
  taskIdentifier: string,
): Promise<JobActionResult> {
  if (!sql) return notConfigured();

  console.info("[backstage] reEnqueueDeadJobs", { taskIdentifier });

  const rows = await sql<{ id: number }[]>`
    update graphile_worker._private_jobs
    set
      attempts = 0,
      last_error = null,
      run_at = now(),
      updated_at = now()
    where task_id = (
      select id from graphile_worker._private_tasks
      where identifier = ${taskIdentifier}
    )
      and attempts >= max_attempts
      and locked_at is null
    returning id
  `;

  revalidatePath("/jobs");
  return {
    ok: true,
    affected: rows.length,
    message:
      rows.length > 0
        ? `Re-enqueued ${rows.length} dead job(s) for "${taskIdentifier}".`
        : `No dead jobs for "${taskIdentifier}".`,
  };
}

/**
 * Delete a single failed job by id. Gated on `last_error is not null`
 * (so this can only ever remove a job that has actually errored) and
 * `locked_at is null` (don't yank a row out from under a running
 * worker). Use when a job is stuck on a permanent failure — bad config,
 * missing grant, deleted upstream resource — and you'd rather clear it
 * than wait through the remaining backoff attempts.
 */
export async function deleteFailedJob(
  jobId: number,
): Promise<JobActionResult> {
  if (!sql) return notConfigured();

  console.info("[backstage] deleteFailedJob", { jobId });

  const rows = await sql<{ id: number }[]>`
    delete from graphile_worker._private_jobs
    where id = ${jobId}
      and last_error is not null
      and locked_at is null
    returning id
  `;

  revalidatePath("/jobs");
  return {
    ok: rows.length > 0,
    affected: rows.length,
    message:
      rows.length > 0
        ? `Deleted job #${jobId}.`
        : `Job #${jobId} not deleted — either it succeeded, is currently running, or no longer exists.`,
  };
}

/**
 * Bulk-delete every errored (last_error not null) job for a task that
 * isn't currently locked. Sibling of `runErroredNow` — same selection
 * minus the `attempts < max_attempts` filter (we'll happily clear dead
 * errored jobs too) and minus the `run_at > now()` filter (clear them
 * regardless of where they sit in the backoff curve).
 */
export async function deleteErroredJobs(
  taskIdentifier: string,
): Promise<JobActionResult> {
  if (!sql) return notConfigured();

  console.info("[backstage] deleteErroredJobs", { taskIdentifier });

  const rows = await sql<{ id: number }[]>`
    delete from graphile_worker._private_jobs
    where task_id = (
      select id from graphile_worker._private_tasks
      where identifier = ${taskIdentifier}
    )
      and last_error is not null
      and locked_at is null
    returning id
  `;

  revalidatePath("/jobs");
  return {
    ok: true,
    affected: rows.length,
    message:
      rows.length > 0
        ? `Deleted ${rows.length} errored job(s) for "${taskIdentifier}".`
        : `No errored jobs to delete for "${taskIdentifier}".`,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   Purge actions — the "I don't care why, get rid of it" sledgehammer.

   All three skip `locked_at IS NOT NULL` so we never yank a row out
   from under a running worker. Operators dealing with a stale-locked
   stuck job hit "Unlock jobs" first to clear the lock, then "Purge".

   No filter on attempts / last_error / run_at: pending, scheduled,
   backed-off, dead — all gone. This is the dev/debug nuke; the
   surgical actions above are the day-2 ops surface.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Delete every unlocked job in the worker schema, regardless of task
 * or queue. The full clean-slate button. Locked (running) jobs are
 * left alone — the worker that owns them keeps its lease.
 */
export async function purgeAllJobs(): Promise<JobActionResult> {
  if (!sql) return notConfigured();

  console.info("[backstage] purgeAllJobs");

  const rows = await sql<{ id: number }[]>`
    delete from graphile_worker._private_jobs
    where locked_at is null
    returning id
  `;

  revalidatePath("/jobs");
  return {
    ok: true,
    affected: rows.length,
    message:
      rows.length > 0
        ? `Purged ${rows.length} job(s) across all tasks.`
        : `Nothing to purge — every job is currently locked or the queue was already empty.`,
  };
}

/**
 * Delete every unlocked job for a given task identifier. Use when you
 * just want a task's queue empty (e.g. you bumped the prompt version
 * and don't want the in-flight enrichment cohort, you'll re-enqueue).
 */
export async function purgeTaskJobs(
  taskIdentifier: string,
): Promise<JobActionResult> {
  if (!sql) return notConfigured();

  console.info("[backstage] purgeTaskJobs", { taskIdentifier });

  const rows = await sql<{ id: number }[]>`
    delete from graphile_worker._private_jobs
    where task_id = (
      select id from graphile_worker._private_tasks
      where identifier = ${taskIdentifier}
    )
      and locked_at is null
    returning id
  `;

  revalidatePath("/jobs");
  return {
    ok: true,
    affected: rows.length,
    message:
      rows.length > 0
        ? `Purged ${rows.length} job(s) for "${taskIdentifier}".`
        : `Nothing to purge for "${taskIdentifier}" — every job is currently locked or the queue was already empty.`,
  };
}

/**
 * Delete every unlocked job in a named queue, across all tasks that
 * route through it. Useful when a single-lane queue (like `enrich_app`)
 * has a backlog you just want gone.
 */
export async function purgeQueueJobs(
  queueName: string,
): Promise<JobActionResult> {
  if (!sql) return notConfigured();

  console.info("[backstage] purgeQueueJobs", { queueName });

  const rows = await sql<{ id: number }[]>`
    delete from graphile_worker._private_jobs
    where job_queue_id = (
      select id from graphile_worker._private_job_queues
      where queue_name = ${queueName}
    )
      and locked_at is null
    returning id
  `;

  revalidatePath("/jobs");
  return {
    ok: true,
    affected: rows.length,
    message:
      rows.length > 0
        ? `Purged ${rows.length} job(s) from queue "${queueName}".`
        : `Nothing to purge in "${queueName}" — every job is currently locked or the queue was already empty.`,
  };
}
