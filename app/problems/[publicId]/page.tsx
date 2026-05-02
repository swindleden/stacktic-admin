import Link from "next/link";
import { notFound } from "next/navigation";
import { dbConfigured } from "@/lib/db/client";
import { getProblemByPublicId } from "@/lib/db/queries/problems";
import { formatDate, relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProblemStatusPill } from "@/components/ProblemStatusPill";
import { ProblemActions } from "./ProblemActions";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ publicId: string }>;
}

export default async function ProblemDetailPage({ params }: Props) {
  const { publicId } = await params;

  if (!dbConfigured) {
    return (
      <Frame title="Problem">
        <EmptyState
          title="Database not configured"
          body="Configure DATABASE_URL_DIRECT to view problems."
        />
      </Frame>
    );
  }

  const problem = await getProblemByPublicId(publicId);
  if (!problem) notFound();

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 bg-surface border-b border-border-soft px-8 py-5">
        <div className="text-xs text-muted mb-1">
          <Link href="/problems" className="hover:text-slate hover:underline">
            Problems
          </Link>{" "}
          / <span className="stk-mono text-slate">{problem.publicId}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-xl font-semibold text-heading flex items-center gap-3">
              Problem report
              <ProblemStatusPill status={problem.status} />
            </h1>
            <p className="text-sm text-muted mt-1">
              Reported{" "}
              <span title={problem.createdAt.toISOString()}>
                {relativeTime(problem.createdAt)}
              </span>{" "}
              · {formatDate(problem.createdAt)}
            </p>
          </div>
        </div>
      </header>

      <div className="px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Panel title="Description">
              <p className="text-sm text-slate whitespace-pre-wrap">
                {problem.description}
              </p>
            </Panel>

            <Panel title="Flagged fields">
              {problem.flaggedFields.length === 0 ? (
                <p className="text-sm text-muted">
                  No specific fields tagged. Read the description for context.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {problem.flaggedFields.map((f) => (
                    <span
                      key={f}
                      className="stk-mono text-xs px-2 py-1 rounded-md bg-bg-warm border border-border-soft text-slate"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Context">
              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                <Dt>Template</Dt>
                <Dd>
                  <span className="text-heading font-medium">
                    {problem.tplName}
                  </span>
                  <span className="stk-mono text-[11px] text-muted-light ml-2">
                    {problem.tplDomain ?? "—"}
                  </span>
                </Dd>
                <Dt>Company</Dt>
                <Dd>
                  <Link
                    href={`/companies/${problem.orgPublicId}`}
                    className="text-link hover:underline"
                  >
                    {problem.orgName}
                  </Link>
                </Dd>
                <Dt>Reporter</Dt>
                <Dd>
                  {problem.reporterEmail ? (
                    <span className="stk-mono text-xs">
                      {problem.reporterEmail}
                    </span>
                  ) : (
                    <span className="text-muted-light">—</span>
                  )}
                </Dd>
                <Dt>Originating tool</Dt>
                <Dd>
                  {problem.originatingToolName ? (
                    <span className="text-slate">
                      {problem.originatingToolName}
                    </span>
                  ) : (
                    <span className="text-muted-light">—</span>
                  )}
                </Dd>
                {problem.resolvedAt ? (
                  <>
                    <Dt>Resolved</Dt>
                    <Dd>
                      <span title={problem.resolvedAt.toISOString()}>
                        {relativeTime(problem.resolvedAt)}
                      </span>
                    </Dd>
                  </>
                ) : null}
                {problem.resolutionNote ? (
                  <>
                    <Dt>Resolution</Dt>
                    <Dd>
                      <span className="text-slate whitespace-pre-wrap">
                        {problem.resolutionNote}
                      </span>
                    </Dd>
                  </>
                ) : null}
              </dl>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Actions">
              <Link
                href={fixTemplateHref(
                  problem.tplId,
                  problem.flaggedFields,
                )}
                className="block w-full text-center px-3 py-2 mb-3 rounded-md text-sm bg-navy text-white hover:bg-ink"
              >
                Fix template →
              </Link>
              <ProblemActions
                publicId={problem.publicId}
                status={problem.status}
              />
              <p className="text-[11px] text-muted-light mt-3">
                Fix template opens the editor with flagged fields
                highlighted. After saving, return here to mark resolved.
              </p>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 bg-surface border-b border-border-soft px-8 py-5">
        <h1 className="text-xl font-semibold text-heading">{title}</h1>
      </header>
      <div className="px-8 py-6">{children}</div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-border rounded-md p-5 shadow-stk-sm">
      <h3 className="text-sm font-semibold text-heading mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Dt({ children }: { children: React.ReactNode }) {
  return <dt className="text-muted">{children}</dt>;
}
function Dd({ children }: { children: React.ReactNode }) {
  return <dd className="text-slate">{children}</dd>;
}

/**
 * Build the fix-template deep link with flagged fields as
 * `?highlight=name,domain,vendor` so the editor scrolls / rings the
 * matching inputs. The customer's tag set (`name`, `logo`, `domain`,
 * `vendor`, `category`, `login_url`, `docs_url`, `status_url`) is
 * passed through verbatim — `EditTemplateForm` does the tag→form-field
 * mapping on its end.
 */
function fixTemplateHref(tplId: number, flaggedFields: string[]): string {
  const tags = flaggedFields.filter((s) => s && s.length > 0);
  const qs = tags.length > 0 ? `?highlight=${tags.join(",")}` : "";
  return `/templates/${tplId}${qs}`;
}
