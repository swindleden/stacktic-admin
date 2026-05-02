import Link from "next/link";
import { notFound } from "next/navigation";
import { dbConfigured } from "@/lib/db/client";
import { getTemplateById } from "@/lib/db/queries/templates";
import { formatInt, relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { UnofficialActions } from "../UnofficialActions";
import { EditTemplateForm } from "./EditTemplateForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ tplId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TemplateDetailPage({
  params,
  searchParams,
}: Props) {
  const { tplId: tplIdStr } = await params;
  const sp = await searchParams;
  const tplId = Number.parseInt(tplIdStr, 10);

  if (!Number.isFinite(tplId) || tplId <= 0) notFound();

  if (!dbConfigured) {
    return (
      <Frame>
        <EmptyState
          title="Database not configured"
          body="Configure DATABASE_URL_DIRECT to view templates."
        />
      </Frame>
    );
  }

  const template = await getTemplateById(tplId);
  if (!template) notFound();

  const highlightTags = parseHighlight(strFromSp(sp.highlight));

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 bg-surface border-b border-border-soft px-8 py-5">
        <div className="text-xs text-muted mb-1">
          <Link href="/templates" className="hover:text-slate hover:underline">
            Templates
          </Link>{" "}
          / <span className="stk-mono text-slate">{template.slug}</span>
        </div>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-xl font-semibold text-heading flex items-center gap-3 flex-wrap">
              {template.name}
              <StatusBadge status={template.status} />
            </h1>
            <p className="text-sm text-muted mt-1 flex items-center gap-3">
              <span>
                {formatInt(template.usedByCount)} org
                {template.usedByCount === 1 ? "" : "s"} using
              </span>
              {template.openProblemsCount > 0 ? (
                <Link
                  href={`/problems?tab=active&tpl=${template.tplId}`}
                  className="text-warning-text hover:underline"
                >
                  {formatInt(template.openProblemsCount)} open problem
                  {template.openProblemsCount === 1 ? "" : "s"}
                </Link>
              ) : null}
              <span>
                Updated{" "}
                <span title={template.updatedAt.toISOString()}>
                  {relativeTime(template.updatedAt)}
                </span>
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <UnofficialActions tplId={template.tplId} />
          </div>
        </div>
      </header>

      <div className="px-8 py-6">
        <EditTemplateForm
          template={template}
          highlightTags={highlightTags}
        />
      </div>
    </div>
  );
}

// ── Badges ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: number }) {
  const meta = statusBadgeMeta(status);
  return (
    <span
      className={[
        "inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide border",
        meta.className,
      ].join(" ")}
    >
      {meta.label}
    </span>
  );
}

function statusBadgeMeta(status: number): { label: string; className: string } {
  // Tracks `ToolTemplateStatus` in lib/db/enums after the Phase 1
  // catalog refactor: Active=1, Ignored=2. The pre-refactor mapping
  // (Pending=1, Approved=2, Ignored=3) caused new operator-cataloged
  // templates to render as "Pending" because catalogObservation writes
  // status=1 (=Active under the new enum, =Pending under the old).
  // Templates can't be Pending anymore — every catalog row exists
  // because an operator committed to it; `tool_observations` is the
  // pre-commit triage queue.
  switch (status) {
    case 1:
      return {
        label: "Active",
        className: "bg-success-soft text-success-text border-success-border",
      };
    case 2:
      return {
        label: "Ignored",
        className: "bg-bg-warm text-muted border-border-soft",
      };
    default:
      return {
        label: `?${status}`,
        className: "bg-bg-warm text-muted border-border-soft",
      };
  }
}

// ── helpers ──────────────────────────────────────────────────────────────

function strFromSp(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

function parseHighlight(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 bg-surface border-b border-border-soft px-8 py-5">
        <h1 className="text-xl font-semibold text-heading">Template</h1>
      </header>
      <div className="px-8 py-6">{children}</div>
    </div>
  );
}
