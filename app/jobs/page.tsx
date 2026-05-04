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
import { CellMono, PageHead } from "@/components/backstage";
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
 * Three sections, all driven by the same fresh DB read:
 *   1. Per-task summary (pending / scheduled / running / dead / errored).
 *   2. Named queues with lock holder and lock age.
 *   3. Recent failures with truncated error.
 *
 * Stale-lock threshold matches the action handler's threshold so the
 * operator never sees a "Force unlock" button on a lock the action would
 * refuse to clear.
 */

const STALE_LOCK_MS = 5 * 60 * 1000;

export default async function JobsPage() {
  if (!dbConfigured) {
    return (
      <Frame purgeEnabled={false}>
        <EmptyState
          title="Database not configured"
          body={
            <>
              Set <code className="stk-mono">DATABASE_URL</code> in
              <code className="stk-mono"> .env.local</code> and restart the dev
              server.
            </>
          }
        />
      </Frame>
    );
  }

  const [tasks, queues, failures] = await Promise.all([
    getJobsTaskSummary(),
    getJobsQueueLocks(),
    getJobsRecentFailures(50),
  ]);

  const now = Date.now();

  // Purge-all enabled iff there's at least one job in the queue,
  // locked or not. The action itself clears queue + job locks before
  // deleting (it's the nuclear option), so we don't gate on
  // unlocked-only here — that just hides the button when the operator
  // most needs it (worker dead, stuck job won't release its lock).
  const hasAnyJobs = tasks.some((t) => t.total > 0);

  return (
    <Frame purgeEnabled={hasAnyJobs}>
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
            <table className="w-full">
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
                      <CellMono tone="ink">{row.taskIdentifier}</CellMono>
                    </Td>
                    <TdNum>{formatInt(row.pending)}</TdNum>
                    <TdNum>{formatInt(row.scheduled)}</TdNum>
                    <TdNum>
                      {row.running > 0 ? (
                        <span className="text-teal">{formatInt(row.running)}</span>
                      ) : (
                        formatInt(row.running)
                      )}
                    </TdNum>
                    <TdNum>
                      {row.dead > 0 ? (
                        <span className="text-danger">{formatInt(row.dead)}</span>
                      ) : (
                        formatInt(row.dead)
                      )}
                    </TdNum>
                    <TdNum>
                      {row.errored > 0 ? (
                        <span className="text-amber">{formatInt(row.errored)}</span>
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
            <table className="w-full">
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
                  const lockAgeMs = row.lockedAt ? now - row.lockedAt.getTime() : null;
                  const isStale = lockAgeMs !== null && lockAgeMs >= STALE_LOCK_MS;
                  return (
                    <tr key={row.queueName} className={tableBodyRowClass}>
                      <Td>
                        <CellMono tone="ink">{row.queueName}</CellMono>
                      </Td>
                      <TdNum>{formatInt(row.jobCount)}</TdNum>
                      <Td>
                        {row.lockedBy ? (
                          <CellMono tone="muted">{row.lockedBy}</CellMono>
                        ) : (
                          <span className="text-muted-2">—</span>
                        )}
                      </Td>
                      <Td>
                        {row.lockedAt ? (
                          <span
                            className={[
                              "font-mono text-[12px]",
                              isStale ? "text-danger" : "text-muted",
                            ].join(" ")}
                            title={row.lockedAt.toISOString()}
                          >
                            {relativeTime(row.lockedAt, new Date(now))}
                          </span>
                        ) : (
                          <span className="text-muted-2">unlocked</span>
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
            <table className="w-full">
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
                  const nextAttemptInPast = row.runAt.getTime() <= now;
                  const oneLineError = row.lastError.split("\n")[0]!.slice(0, 140);
                  return (
                    <tr key={row.id} className={tableBodyRowClass}>
                      <TdNum>
                        <span className="text-muted-2">{row.id}</span>
                      </TdNum>
                      <Td>
                        <CellMono tone="ink">{row.taskIdentifier}</CellMono>
                      </Td>
                      <Td>
                        <CellMono tone="muted">{row.attempts} of {row.maxAttempts}</CellMono>
                      </Td>
                      <Td>
                        <span className="text-[12px] text-danger" title={row.lastError}>
                          {oneLineError}
                          {row.lastError.length > 140 ? "…" : ""}
                        </span>
                      </Td>
                      <Td>
                        <span
                          className={[
                            "font-mono text-[12px]",
                            nextAttemptInPast ? "text-teal" : "text-muted",
                          ].join(" ")}
                          title={row.runAt.toISOString()}
                        >
                          {nextAttemptInPast ? "ready" : relativeTime(row.runAt, new Date(now))}
                        </span>
                      </Td>
                      <Td>{row.lockedAt ? null : <FailureActions jobId={row.id} />}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableCard>
        )}
      </Section>
    </Frame>
  );
}

function Frame({
  purgeEnabled,
  children,
}: {
  purgeEnabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="px-9 pt-7 pb-9">
      <PageHead
        title="Jobs"
        subtitle="graphile-worker queue state · refresh the page for the latest counts"
        controls={<PurgeAllAction enabled={purgeEnabled} />}
      />
      <div className="space-y-8">{children}</div>
    </div>
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
      <div className="mb-3.5">
        <h2 className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-muted font-medium">{title}</h2>
        {subtitle ? (
          <p className="text-[12.5px] text-ink-2 mt-1.5 max-w-3xl tracking-[-0.005em] leading-[1.5]">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
