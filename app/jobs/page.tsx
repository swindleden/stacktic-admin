import { dbConfigured } from "@/lib/db/client";
import {
  getJobsQueueLocks,
  getJobsRecentFailures,
  getJobsTaskSummary,
} from "@/lib/db/queries/jobs";
import { formatInt, relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  TableCard,
  Td,
  TdNum,
  Th,
  ThNum,
  tableBodyRowClass,
  tableHeadClass,
} from "@/components/ui/TableCard";
import {
  FailureActions,
  PurgeAllAction,
  QueueActions,
  TaskActions,
} from "./JobActions";

export const dynamic = "force-dynamic";

/**
 * Jobs — graphile-worker queue dashboard.
 *
 * Three sections, all driven by the same five-second-old DB read:
 *
 *   1. Per-task summary  — Pending / Scheduled / Running / Dead +
 *      Errored, with operator actions (unlock jobs, run errored now,
 *      re-enqueue dead) gated on the task having those states.
 *
 *   2. Named queues      — One row per `job_queues` entry, lock holder
 *      and lock age. Force-unlock surfaces only on stale locks (5+ min).
 *
 *   3. Recent failures   — Last 50 failed jobs with truncated error
 *      messages. Click into the future for a per-job detail page.
 *
 * Stale-lock threshold is 5 minutes — matches the threshold the action
 * handlers use, so the operator never sees a "Force unlock" button on
 * a lock the action would refuse to clear.
 */

const STALE_LOCK_MS = 5 * 60 * 1000;

export default async function JobsPage() {
  if (!dbConfigured) {
    return (
      <div className="flex flex-col">
        <Header purgeEnabled={false} />
        <div className="px-8 py-6">
          <EmptyState
            title="Database not configured"
            body={
              <>
                Set <code className="stk-mono">DATABASE_URL_DIRECT</code> in
                <code className="stk-mono"> .env.local</code> and restart the
                dev server.
              </>
            }
          />
        </div>
      </div>
    );
  }

  const [tasks, queues, failures] = await Promise.all([
    getJobsTaskSummary(),
    getJobsQueueLocks(),
    getJobsRecentFailures(50),
  ]);

  const now = Date.now();

  // Purge-all is enabled iff at least one task has any unlocked job
  // (anything purgeAllJobs() would actually delete). Avoids surfacing a
  // confirm dialog that resolves to "Nothing to purge."
  const hasAnyUnlocked = tasks.some(
    (t) => t.total - t.running > 0,
  );

  return (
    <div className="flex flex-col">
      <Header purgeEnabled={hasAnyUnlocked} />

      <div className="px-8 py-6 space-y-8">
        <Section
          title="Tasks"
          subtitle="Per-task counts. Pending = ready now. Scheduled = future / backoff. Errored overlaps with the others (a job in backoff after a failed attempt counts in both)."
        >
          {tasks.length === 0 ? (
            <EmptyState
              title="No jobs in the queue"
              body="Either everything's drained successfully, or no tasks have been enqueued yet."
            />
          ) : (
            <TableCard>
              <table className="w-full text-sm">
                <thead className={tableHeadClass}>
                  <tr>
                    <Th>Task</Th>
                    <ThNum>Pending</ThNum>
                    <ThNum>Scheduled</ThNum>
                    <ThNum>Running</ThNum>
                    <ThNum>Dead</ThNum>
                    <ThNum>Errored</ThNum>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((row) => (
                    <tr key={row.taskIdentifier} className={tableBodyRowClass}>
                      <Td>
                        <span className="stk-mono text-slate">
                          {row.taskIdentifier}
                        </span>
                      </Td>
                      <TdNum>{formatInt(row.pending)}</TdNum>
                      <TdNum>{formatInt(row.scheduled)}</TdNum>
                      <TdNum>
                        {row.running > 0 ? (
                          <span className="text-success-text">
                            {formatInt(row.running)}
                          </span>
                        ) : (
                          formatInt(row.running)
                        )}
                      </TdNum>
                      <TdNum>
                        {row.dead > 0 ? (
                          <span className="text-critical-text">
                            {formatInt(row.dead)}
                          </span>
                        ) : (
                          formatInt(row.dead)
                        )}
                      </TdNum>
                      <TdNum>
                        {row.errored > 0 ? (
                          <span className="text-warning-text">
                            {formatInt(row.errored)}
                          </span>
                        ) : (
                          formatInt(row.errored)
                        )}
                      </TdNum>
                      <Td>
                        <TaskActions
                          taskIdentifier={row.taskIdentifier}
                          hasErrored={row.errored > 0}
                          hasDead={row.dead > 0}
                          hasLocked={row.running > 0}
                          hasUnlocked={row.total - row.running > 0}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          )}
        </Section>

        <Section
          title="Queues"
          subtitle='Named queues serialize their jobs. A stale lock blocks subsequent workers from picking up jobs in that queue — even when the jobs themselves are unlocked. "Force unlock" appears when the lock has been held for 5+ minutes.'
        >
          {queues.length === 0 ? (
            <EmptyState
              title="No named queues"
              body="Tasks that don't use a named queue (most don't) won't show up here."
            />
          ) : (
            <TableCard>
              <table className="w-full text-sm">
                <thead className={tableHeadClass}>
                  <tr>
                    <Th>Queue</Th>
                    <ThNum>Jobs</ThNum>
                    <Th>Lock holder</Th>
                    <Th>Locked since</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {queues.map((row) => {
                    const lockAgeMs = row.lockedAt
                      ? now - row.lockedAt.getTime()
                      : null;
                    const isStale =
                      lockAgeMs !== null && lockAgeMs >= STALE_LOCK_MS;
                    return (
                      <tr key={row.queueName} className={tableBodyRowClass}>
                        <Td>
                          <span className="stk-mono text-slate">
                            {row.queueName}
                          </span>
                        </Td>
                        <TdNum>{formatInt(row.jobCount)}</TdNum>
                        <Td>
                          {row.lockedBy ? (
                            <span className="stk-mono text-xs text-muted">
                              {row.lockedBy}
                            </span>
                          ) : (
                            <span className="text-muted-light">—</span>
                          )}
                        </Td>
                        <Td>
                          {row.lockedAt ? (
                            <span
                              className={[
                                "stk-mono text-xs",
                                isStale ? "text-critical-text" : "text-muted",
                              ].join(" ")}
                              title={row.lockedAt.toISOString()}
                            >
                              {relativeTime(row.lockedAt, new Date(now))}
                            </span>
                          ) : (
                            <span className="text-muted-light">unlocked</span>
                          )}
                        </Td>
                        <Td>
                          <QueueActions
                            queueName={row.queueName}
                            showForceUnlock={isStale}
                            showPurge={row.jobCount > 0}
                          />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableCard>
          )}
        </Section>

        <Section
          title="Recent failures"
          subtitle="Last 50 jobs with a logged error. Newest first. Stack traces are truncated — full text is in the database."
        >
          {failures.length === 0 ? (
            <EmptyState
              title="No recent failures"
              body="Either nothing's failed lately, or graphile-worker garbage-collected the rows."
            />
          ) : (
            <TableCard>
              <table className="w-full text-sm">
                <thead className={tableHeadClass}>
                  <tr>
                    <ThNum>#</ThNum>
                    <Th>Task</Th>
                    <Th>Attempts</Th>
                    <Th>Error</Th>
                    <Th>Next attempt</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {failures.map((row) => {
                    const nextAttemptInPast =
                      row.runAt.getTime() <= now;
                    const oneLineError = row.lastError
                      .split("\n")[0]!
                      .slice(0, 140);
                    return (
                      <tr key={row.id} className={tableBodyRowClass}>
                        <TdNum>
                          <span className="text-muted-light">{row.id}</span>
                        </TdNum>
                        <Td>
                          <span className="stk-mono text-slate">
                            {row.taskIdentifier}
                          </span>
                        </Td>
                        <Td>
                          <span className="stk-mono text-xs text-muted">
                            {row.attempts} of {row.maxAttempts}
                          </span>
                        </Td>
                        <Td>
                          <span
                            className="text-xs text-critical-text"
                            title={row.lastError}
                          >
                            {oneLineError}
                            {row.lastError.length > 140 ? "…" : ""}
                          </span>
                        </Td>
                        <Td>
                          <span
                            className={[
                              "stk-mono text-xs",
                              nextAttemptInPast
                                ? "text-success-text"
                                : "text-muted",
                            ].join(" ")}
                            title={row.runAt.toISOString()}
                          >
                            {nextAttemptInPast
                              ? "ready"
                              : relativeTime(row.runAt, new Date(now))}
                          </span>
                        </Td>
                        <Td>
                          {row.lockedAt ? null : (
                            <FailureActions jobId={row.id} />
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableCard>
          )}
        </Section>
      </div>
    </div>
  );
}

function Header({ purgeEnabled }: { purgeEnabled: boolean }) {
  return (
    <header className="sticky top-0 z-10 bg-surface border-b border-border-soft px-8 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-heading">Jobs</h1>
          <p className="text-sm text-muted">
            graphile-worker queue state. Refresh the page for the latest counts.
          </p>
        </div>
        <PurgeAllAction enabled={purgeEnabled} />
      </div>
    </header>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <h2 className="text-base font-semibold text-heading">{title}</h2>
          {subtitle ? (
            <p className="text-xs text-muted mt-0.5 max-w-3xl">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
