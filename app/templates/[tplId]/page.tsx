import Link from "next/link";
import { notFound } from "next/navigation";
import { dbConfigured } from "@/lib/db/client";
import { getTemplateById } from "@/lib/db/queries/templates";
import { formatInt, relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Breadcrumbs,
  DetailAvatar,
  DetailHeader,
  Pill,
  type PillKind,
} from "@/components/backstage";
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
    <Frame>
      <Breadcrumbs
        items={[
          { label: "Templates", href: "/templates" },
          { label: template.slug },
        ]}
      />

      <DetailHeader
        avatar={<DetailAvatar name={template.name} />}
        title={template.name}
        pill={<StatusPill status={template.status} />}
        id={template.slug}
        controls={<UnofficialActions tplId={template.tplId} />}
      />

      <div className="flex items-center gap-4 -mt-2 mb-6 font-mono text-[11.5px] text-muted tracking-[0.02em]">
        <span>
          {formatInt(template.usedByCount)} org{template.usedByCount === 1 ? "" : "s"} using
        </span>
        {template.openProblemsCount > 0 ? (
          <Link
            href={`/problems?tab=active&tpl=${template.tplId}` as never}
            className="text-amber hover:underline"
          >
            {formatInt(template.openProblemsCount)} open problem{template.openProblemsCount === 1 ? "" : "s"}
          </Link>
        ) : null}
        <span>
          Updated{" "}
          <span title={template.updatedAt.toISOString()}>
            {relativeTime(template.updatedAt)}
          </span>
        </span>
      </div>

      <EditTemplateForm template={template} highlightTags={highlightTags} />
    </Frame>
  );
}

// ── Pills ─────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: number }) {
  const meta = statusMeta(status);
  return <Pill kind={meta.kind}>{meta.label}</Pill>;
}

function statusMeta(status: number): { label: string; kind: PillKind } {
  // Active=1, Ignored=2 (post-Phase-1-catalog refactor). Templates can't
  // be Pending — every catalog row exists because an operator committed
  // to it; tool_observations is the pre-commit triage queue.
  switch (status) {
    case 1:
      return { label: "active", kind: "active" };
    case 2:
      return { label: "ignored", kind: "ignored" };
    default:
      return { label: `?${status}`, kind: "neutral" };
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
  return <div className="px-9 pt-7 pb-9">{children}</div>;
}
