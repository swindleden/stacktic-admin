import Link from "next/link";
import type { Route } from "next";
import { dbConfigured } from "@/lib/db/client";
import {
  listProblems,
  type ProblemStatusFilter,
} from "@/lib/db/queries/problems";
import { relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import {
  TableCard,
  Td,
  Th,
  tableBodyRowClass,
  tableHeadClass,
} from "@/components/ui/TableCard";
import { ProblemStatusPill } from "@/components/ProblemStatusPill";
import { CellMono, PageHead } from "@/components/backstage";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const TAB_DEFS: Array<{ id: ProblemStatusFilter; label: string }> = [
  { id: "active", label: "Active" }, // Open + Acknowledged
  { id: "resolved", label: "Resolved" }, // Resolved + Dismissed
  { id: "all", label: "All" },
];

export default async function ProblemsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tabRaw = strFromSp(sp.tab) ?? strFromSp(sp.status) ?? "active";
  const tab: ProblemStatusFilter = isValidStatus(tabRaw) ? tabRaw : "active";
  const page = Math.max(1, Number.parseInt(strFromSp(sp.page) ?? "1", 10) || 1);

  const listing = await listProblems({
    status: tab,
    page,
    pageSize: PAGE_SIZE,
  });

  const tabs: TabItem[] = TAB_DEFS.map((t) => ({
    id: t.id,
    label: t.label,
    badge: t.id === tab ? listing.total : undefined,
  }));

  return (
    <div className="px-9 pt-7 pb-9">
      <PageHead
        title="Problems"
        subtitle="Customer-reported problems with global tool templates · triage, correct, mark resolved"
      />

      <Tabs tabs={tabs} active={tab} />

      {!dbConfigured ? (
        <EmptyState
          title="Database not configured"
          body="Configure DATABASE_URL_DIRECT to load problems."
        />
      ) : listing.rows.length === 0 ? (
        <EmptyState
          title={
            tab === "active"
              ? "No active problems"
              : tab === "resolved"
                ? "No resolved problems yet"
                : "No problems yet"
          }
          body={
            tab === "active"
              ? "When customers report problems with global templates, they'll show here."
              : "Closed problems will appear here once the queue gets worked."
          }
        />
      ) : (
        <TableCard
          footer={
            <Pagination
              page={listing.page}
              pageSize={listing.pageSize}
              total={listing.total}
              hrefForPage={(p) =>
                `/problems?${buildQs({ ...sp, tab, page: String(p) })}`
              }
            />
          }
        >
          <table className="w-full">
            <thead className={tableHeadClass}>
              <tr>
                <Th>Reported</Th>
                <Th>Template</Th>
                <Th>Company</Th>
                <Th>What&apos;s wrong</Th>
                <Th>Description</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {listing.rows.map((row) => (
                <tr key={row.publicId} className={tableBodyRowClass}>
                  <Td>
                    <Link
                      href={`/problems/${row.publicId}` as Route}
                      className="font-mono text-[12px] text-teal hover:underline"
                      title={row.createdAt.toISOString()}
                    >
                      {relativeTime(row.createdAt)}
                    </Link>
                  </Td>
                  <Td>
                    <div className="font-semibold text-ink tracking-[-0.005em]">
                      {row.tplName}
                    </div>
                    <CellMono tone="muted" className="block text-[11px] mt-0.5">
                      {row.tplDomain ?? "—"}
                    </CellMono>
                  </Td>
                  <Td>
                    <Link
                      href={`/companies/${row.orgPublicId}` as Route}
                      className="text-ink-2 hover:text-teal"
                    >
                      {row.orgName}
                    </Link>
                  </Td>
                  <Td>
                    {row.flaggedFields.length === 0 ? (
                      <CellMono tone="muted">—</CellMono>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {row.flaggedFields.map((f) => (
                          <span
                            key={f}
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-paper-2 border border-line text-ink-2"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <span className="text-[13px] text-ink-2 line-clamp-2 max-w-[360px] block">
                      {row.description}
                    </span>
                  </Td>
                  <Td>
                    <ProblemStatusPill status={row.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function strFromSp(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

function buildQs(params: Record<string, string | string[] | undefined>) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      const first = v[0];
      if (first) out.set(k, first);
    } else {
      out.set(k, v);
    }
  }
  return out.toString();
}

function isValidStatus(s: string): s is ProblemStatusFilter {
  return s === "active" || s === "open" || s === "resolved" || s === "all";
}
