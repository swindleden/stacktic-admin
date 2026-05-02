"use client";

/**
 * Inline action buttons for the Jobs dashboard.
 *
 * Two component flavors:
 *   <QueueActions queueName lockStale />
 *     — Force-unlock the named queue. Only render when the queue's
 *       lock is older than 5 minutes (the parent decides; we just
 *       render the button + confirm flow).
 *
 *   <TaskActions taskIdentifier hasErrored hasDead hasLocked />
 *     — Three buttons gated on whether the task has the relevant
 *       state. "Force-unlock jobs" only when running locks are stale,
 *       "Run errored now" only when there are backed-off jobs,
 *       "Re-enqueue dead" only when there are dead jobs.
 *
 * Confirm: native window.confirm(). Site-admin is a one-operator
 * local tool; a real Dialog is overkill.
 *
 * After a successful action: router.refresh() to re-read the queue
 * state. The action handler also calls revalidatePath, but refresh()
 * is the belt-and-braces version that also updates the URL state if
 * we ever add filtering.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteErroredJobs,
  deleteFailedJob,
  forceUnlockJobs,
  forceUnlockQueue,
  purgeAllJobs,
  purgeQueueJobs,
  purgeTaskJobs,
  reEnqueueDeadJobs,
  runErroredNow,
  type JobActionResult,
} from "./actions";

type ActionFn = () => Promise<JobActionResult>;

function ActionButton({
  label,
  confirm,
  fn,
  tone = "neutral",
  size = "sm",
}: {
  label: string;
  confirm: string;
  fn: ActionFn;
  tone?: "neutral" | "danger";
  size?: "sm" | "xs";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<JobActionResult | null>(null);

  function run() {
    if (pending) return;
    if (!window.confirm(confirm)) return;
    startTransition(async () => {
      const res = await fn();
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  const sizeClass =
    size === "xs"
      ? "px-2 py-1 text-[10.5px]"
      : "px-2.5 py-1 text-[11px]";
  const toneClass =
    tone === "danger"
      ? "border-danger/30 text-danger hover:bg-danger-tint"
      : "border-line text-muted hover:text-ink hover:bg-paper-3";

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className={[
          "inline-flex items-center rounded-sm border bg-paper-4 font-mono tracking-[0.04em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          sizeClass,
          toneClass,
        ].join(" ")}
      >
        {pending ? "Working…" : label}
      </button>
      {result ? (
        <span
          className={[
            "font-mono text-[10.5px]",
            result.ok ? "text-teal" : "text-danger",
          ].join(" ")}
        >
          {result.message}
        </span>
      ) : null}
    </span>
  );
}

export function QueueActions({
  queueName,
  showForceUnlock,
  showPurge,
}: {
  queueName: string;
  showForceUnlock: boolean;
  showPurge: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {showForceUnlock ? (
        <ActionButton
          label="Force unlock"
          tone="danger"
          size="xs"
          confirm={`Force-unlock the queue "${queueName}"? This is safe when the worker that holds the lock is gone.`}
          fn={() => forceUnlockQueue(queueName)}
        />
      ) : null}
      {showPurge ? (
        <ActionButton
          label="Purge"
          tone="danger"
          size="xs"
          confirm={`Delete every unlocked job in the queue "${queueName}"? Locked (running) jobs are left alone. Use when you want this queue empty regardless of state.`}
          fn={() => purgeQueueJobs(queueName)}
        />
      ) : null}
    </span>
  );
}

/**
 * Purge-all sits in the page header and ignores task/queue scope.
 * Renders nothing when there are zero jobs in the queue. The action
 * clears queue + job locks before deleting so a stale-locked stuck
 * job (worker dead but lock still held) doesn't hide the button — the
 * page enables this whenever ANY job exists, locked or not.
 */
export function PurgeAllAction({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <ActionButton
      label="Purge all"
      tone="danger"
      size="sm"
      confirm="Delete every job in graphile_worker, across all tasks and queues — including locked / running ones. Queue + job locks are cleared first so any live worker doesn't hold pointers to deleted rows. Restart the worker afterward. Use only on dev / when you really mean it."
      fn={() => purgeAllJobs()}
    />
  );
}

export function TaskActions({
  taskIdentifier,
  hasErrored,
  hasDead,
  hasLocked,
  hasUnlocked,
}: {
  taskIdentifier: string;
  hasErrored: boolean;
  hasDead: boolean;
  hasLocked: boolean;
  /** True if the task has at least one unlocked job (pending, scheduled,
   *  errored, or dead). Used to gate the "Purge" button — there's no
   *  point offering a purge on a task whose only jobs are running. */
  hasUnlocked: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {hasLocked ? (
        <ActionButton
          label="Unlock jobs"
          size="xs"
          confirm={`Force-unlock all stale (5+ min) job locks for "${taskIdentifier}"? Use after a worker died mid-job.`}
          fn={() => forceUnlockJobs(taskIdentifier)}
        />
      ) : null}
      {hasErrored ? (
        <ActionButton
          label="Run errored now"
          size="xs"
          confirm={`Pull every backed-off "${taskIdentifier}" job forward to run immediately? Use after the underlying cause is fixed.`}
          fn={() => runErroredNow(taskIdentifier)}
        />
      ) : null}
      {hasDead ? (
        <ActionButton
          label="Re-enqueue dead"
          tone="danger"
          size="xs"
          confirm={`Reset attempts on dead "${taskIdentifier}" jobs and run them again? Only use if the failure cause is fixed.`}
          fn={() => reEnqueueDeadJobs(taskIdentifier)}
        />
      ) : null}
      {hasErrored ? (
        <ActionButton
          label="Clear errored"
          tone="danger"
          size="xs"
          confirm={`Delete every errored "${taskIdentifier}" job? Use when the failure is permanent (bad config, missing grant, deleted resource) and you don't want to wait through the remaining backoff attempts.`}
          fn={() => deleteErroredJobs(taskIdentifier)}
        />
      ) : null}
      {hasUnlocked ? (
        <ActionButton
          label="Purge"
          tone="danger"
          size="xs"
          confirm={`Delete every unlocked job for "${taskIdentifier}"? Locked (running) jobs are left alone. Use when you want this task's queue empty regardless of state.`}
          fn={() => purgeTaskJobs(taskIdentifier)}
        />
      ) : null}
    </span>
  );
}

export function FailureActions({ jobId }: { jobId: number }) {
  return (
    <ActionButton
      label="Delete"
      tone="danger"
      size="xs"
      confirm={`Delete job #${jobId}? It won't run again. Use when the failure is permanent and you'd rather clear it than wait through the remaining backoff attempts.`}
      fn={() => deleteFailedJob(jobId)}
    />
  );
}
