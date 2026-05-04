import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { dbConfigured } from "@/lib/db/client";
import { getProblemByPublicId } from "@/lib/db/queries/problems";
import { formatDate, relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProblemStatusPill } from "@/components/ProblemStatusPill";
import {
  Breadcrumbs,
  DetailAvatar,
  DetailHeader,
  FieldList,
  Panel,
  PanelBody,
  PanelHeader,
  type Field,
} from "@/components/backstage";
import { ProblemActions } from "./ProblemActions";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ publicId: string }>;
}

export default async function ProblemDetailPage({ params }: Props) {
  const { publicId } = await params;

  if (!dbConfigured) {
    return (
      <Frame>
        <EmptyState
          title="Database not configured"
          body="Configure DATABASE_URL to view problems."
        />
      </Frame>
    );
  }

  const problem = await getProblemByPublicId(publicId);
  if (!problem) notFound();

  const contextFields: Field[] = [
    {
      label: "Template",
      value: (
        <span>
          <span className="font-semibold text-ink">{problem.tplName}</span>
          <span className="font-mono text-[11.5px] text-muted-2 ml-2">
            {problem.tplDomain ?? "—"}
          </span>
        </span>
      ),
    },
    {
      label: "Company",
      value: (
        <Link
          href={`/companies/${problem.orgPublicId}` as Route}
          className="text-teal hover:underline"
        >
          {problem.orgName}
        </Link>
      ),
    },
    {
      label: "Reporter",
      value: problem.reporterEmail
        ? <span className="font-mono text-[12.5px]">{problem.reporterEmail}</span>
        : <span className="text-muted-2">—</span>,
      mono: false,
    },
    {
      label: "Originating tool",
      value: problem.originatingToolName ?? <span className="text-muted-2">—</span>,
    },
    {
      label: "Reported",
      value: (
        <span>
          <span title={problem.createdAt.toISOString()}>{relativeTime(problem.createdAt)}</span>
          <span className="font-mono text-[11.5px] text-muted-2 ml-2">
            {formatDate(problem.createdAt)}
          </span>
        </span>
      ),
    },
  ];

  if (problem.resolvedAt) {
    contextFields.push({
      label: "Resolved",
      value: <span title={problem.resolvedAt.toISOString()}>{relativeTime(problem.resolvedAt)}</span>,
    });
  }
  if (problem.resolutionNote) {
    contextFields.push({
      label: "Resolution",
      value: <span className="whitespace-pre-wrap">{problem.resolutionNote}</span>,
    });
  }

  return (
    <Frame>
      <Breadcrumbs
        items={[
          { label: "Problems", href: "/problems" },
          { label: problem.publicId },
        ]}
      />

      <DetailHeader
        avatar={<DetailAvatar name={problem.tplName} />}
        title="Problem report"
        pill={<ProblemStatusPill status={problem.status} />}
        id={problem.publicId}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3.5">
        <div className="flex flex-col gap-3.5 min-w-0">
          <Panel>
            <PanelHeader title="Description" />
            <PanelBody>
              <p className="text-[13.5px] text-ink-2 whitespace-pre-wrap leading-[1.55]">
                {problem.description}
              </p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Flagged fields" hint={`${problem.flaggedFields.length} tagged`} />
            <PanelBody>
              {problem.flaggedFields.length === 0 ? (
                <p className="font-mono text-[12px] text-muted">
                  No specific fields tagged. Read the description for context.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {problem.flaggedFields.map((f) => (
                    <span
                      key={f}
                      className="font-mono text-[11px] px-2 py-1 rounded-sm bg-paper-2 border border-line text-ink-2"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Context" />
            <PanelBody>
              <FieldList fields={contextFields} />
            </PanelBody>
          </Panel>
        </div>

        <div className="flex flex-col gap-3.5 min-w-0">
          <Panel>
            <PanelHeader title="Actions" />
            <PanelBody>
              <Link
                href={fixTemplateHref(problem.tplId, problem.flaggedFields) as Route}
                className="block w-full text-center px-3 py-2 mb-3 rounded font-sans text-[12.5px] font-medium bg-ink text-paper border border-ink hover:bg-ink/90"
              >
                Fix template →
              </Link>
              <ProblemActions publicId={problem.publicId} status={problem.status} />
              <p className="font-mono text-[10.5px] text-muted-2 mt-3 tracking-[0.04em]">
                Fix template opens the editor with flagged fields highlighted. After saving, return here to mark resolved.
              </p>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="px-9 pt-7 pb-9">{children}</div>;
}

function fixTemplateHref(tplId: number, flaggedFields: string[]): string {
  const tags = flaggedFields.filter((s) => s && s.length > 0);
  const qs = tags.length > 0 ? `?highlight=${tags.join(",")}` : "";
  return `/templates/${tplId}${qs}`;
}
