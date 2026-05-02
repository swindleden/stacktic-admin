import Link from "next/link";
import type { Route } from "next";
import { dbConfigured } from "@/lib/db/client";
import {
  getObservationsCounts,
  listPendingObservations,
  type ListObservationsOptions,
  type ObservationChannel,
  type ObservationGroupRow,
  type ObservationSort,
} from "@/lib/db/queries/observations";
import {
  getTemplatesCounts,
  listApprovedTemplates,
  listIgnoredTemplates,
  type ListTemplatesOptions,
  type TemplateRow,
  type TemplateSort,
} from "@/lib/db/queries/templates";
import { formatInt, relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { SortSelect } from "@/components/ui/SortSelect";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import {
  TableCard,
  Td,
  TdNum,
  Th,
  ThNum,
  tableBodyRowClass,
  tableHeadClass,
} from "@/components/ui/TableCard";
import { TemplatesHeaderActions } from "./TemplatesHeaderActions";
import { IgnoreObservationButton } from "./observations/IgnoreObservationButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type TabId = "observations" | "approved" | "ignored";

const OBSERVATION_SORT_OPTIONS = [
  { value: "recent", label: "Sort: Most recent" },
  { value: "org_count_desc", label: "Most orgs" },
  { value: "name_asc", label: "Name A → Z" },
  { value: "first_seen_asc", label: "First seen" },
];

const APPROVED_SORT_OPTIONS = [
  { value: "name_asc", label: "Name A → Z" },
  { value: "used_by_desc", label: "Most used" },
  { value: "recent", label: "Most recently updated" },
];

const IGNORED_SORT_OPTIONS = [
  { value: "recent", label: "Sort: Most recent" },
  { value: "name_asc", label: "Name A → Z" },
];

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TemplatesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab = parseTab(strFromSp(sp.tab));
  const q = strFromSp(sp.q);
  const sort = strFromSp(sp.sort);
  const channel = parseChannel(strFromSp(sp.channel));
  const page = Math.max(1, Number.parseInt(strFromSp(sp.page) ?? "1", 10) || 1);

  const [tplCounts, obsCounts] = await Promise.all([
    getTemplatesCounts(),
    getObservationsCounts(),
  ]);

  const tabs: TabItem[] = [
    { id: "observations", label: "Observations", badge: obsCounts.pending },
    { id: "approved", label: "Approved", badge: tplCounts.approved },
    { id: "ignored", label: "Ignored", badge: tplCounts.ignored },
  ];

  const sortOptions =
    tab === "approved"
      ? APPROVED_SORT_OPTIONS
      : tab === "ignored"
        ? IGNORED_SORT_OPTIONS
        : OBSERVATION_SORT_OPTIONS;

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 bg-surface border-b border-border-soft px-8 py-5 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold text-heading">Templates</h1>
          <p className="text-sm text-muted">
            Catalog of officially supported tools, plus the observation
            queue of customer-detected names awaiting your triage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TemplatesHeaderActions />
        </div>
      </header>

      <div className="px-8 py-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <Tabs tabs={tabs} active={tab} />
          <div className="flex items-center gap-2 pb-2">
            <SearchInput placeholder={searchPlaceholder(tab)} />
            <SortSelect
              options={sortOptions}
              defaultValue={sortOptions[0]!.value}
            />
          </div>
        </div>

        {!dbConfigured ? (
          <EmptyState
            title="Database not configured"
            body="Configure DATABASE_URL_DIRECT to load templates."
          />
        ) : tab === "approved" ? (
          <ApprovedTab sp={sp} q={q} sort={sort} page={page} />
        ) : tab === "ignored" ? (
          <IgnoredTab sp={sp} q={q} sort={sort} page={page} />
        ) : (
          <ObservationsTab
            sp={sp}
            q={q}
            sort={sort}
            channel={channel}
            page={page}
          />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Observations tab
   ══════════════════════════════════════════════════════════════════════ */

async function ObservationsTab({
  sp,
  q,
  sort,
  channel,
  page,
}: {
  sp: Record<string, string | string[] | undefined>;
  q: string | undefined;
  sort: string | undefined;
  channel: ObservationChannel | undefined;
  page: number;
}) {
  const opts: ListObservationsOptions = {
    page,
    pageSize: PAGE_SIZE,
    ...(q ? { q } : {}),
    ...(isValidObservationSort(sort) ? { sort } : {}),
    ...(channel ? { channel } : {}),
  };
  const listing = await listPendingObservations(opts);

  if (listing.rows.length === 0) {
    return (
      <EmptyState
        title={q ? "No observations match" : "Nothing to triage"}
        body={
          q
            ? "Try a different search term or clear the filter."
            : "Customer-detected names will land here as OAuth scans surface unmatched apps and customers add tools manually."
        }
      />
    );
  }

  return (
    <TableCard
      footer={
        <Pagination
          page={listing.page}
          pageSize={listing.pageSize}
          total={listing.total}
          hrefForPage={(p) =>
            `/templates?${buildQs({ ...sp, tab: "observations", page: String(p) })}`
          }
        />
      }
    >
      <table className="w-full text-sm">
        <thead className={tableHeadClass}>
          <tr>
            <Th>Observation</Th>
            <Th>Channel</Th>
            <ThNum>Orgs</ThNum>
            <Th>OAuth client</Th>
            <Th>Last seen</Th>
            <Th>{""}</Th>
          </tr>
        </thead>
        <tbody>
          {listing.rows.map((row) => (
            <ObservationRow key={row.normalizedName} row={row} />
          ))}
        </tbody>
      </table>
    </TableCard>
  );
}

function ObservationRow({ row }: { row: ObservationGroupRow }) {
  const drillInHref =
    `/templates/observations/${encodeURIComponent(row.normalizedName)}` as Route;
  return (
    <tr className={tableBodyRowClass}>
      <Td>
        <Link
          href={drillInHref}
          className="font-medium text-heading hover:text-link hover:underline"
        >
          {row.sampleDisplayText}
        </Link>
        <div className="stk-mono text-[10.5px] text-muted-light mt-0.5">
          {row.normalizedName}
        </div>
      </Td>
      <Td>
        <ChannelBadges
          anyManual={row.anyManual}
          anyOauth={row.anyOauth}
        />
      </Td>
      <TdNum>{formatInt(row.orgCount)}</TdNum>
      <Td>
        {row.distinctClientIds === 0 ? (
          <span className="text-xs text-muted-light">—</span>
        ) : row.distinctClientIds === 1 ? (
          <span
            className="stk-mono text-[10.5px] text-muted"
            title={row.sampleClientId ?? undefined}
          >
            {truncate(row.sampleClientId ?? "", 18)}
          </span>
        ) : (
          <span className="text-xs text-warning-text" title="Multiple distinct OAuth client IDs across orgs — may be different vendors with the same display name.">
            {row.distinctClientIds} distinct
          </span>
        )}
      </Td>
      <Td>
        <span
          className="text-muted text-xs"
          title={row.lastSeenAt.toISOString()}
        >
          {relativeTime(row.lastSeenAt)}
        </span>
      </Td>
      <Td>
        <div className="flex justify-end gap-1">
          <Link
            href={drillInHref}
            className="text-xs px-2 py-1 rounded border border-border text-slate hover:bg-bg-warm"
          >
            Triage
          </Link>
          <IgnoreObservationButton normalizedName={row.normalizedName} />
        </div>
      </Td>
    </tr>
  );
}

function ChannelBadges({
  anyManual,
  anyOauth,
}: {
  anyManual: boolean;
  anyOauth: boolean;
}) {
  return (
    <div className="flex gap-1">
      {anyManual ? (
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-warning-soft text-warning-text border border-warning-border">
          Manual
        </span>
      ) : null}
      {anyOauth ? (
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-info-soft text-info-text border border-info-border">
          OAuth
        </span>
      ) : null}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Approved + Ignored tabs (catalog templates)
   ══════════════════════════════════════════════════════════════════════ */

async function ApprovedTab({
  sp,
  q,
  sort,
  page,
}: {
  sp: Record<string, string | string[] | undefined>;
  q: string | undefined;
  sort: string | undefined;
  page: number;
}) {
  const opts = buildTemplateOpts({ q, sort, page });
  const listing = await listApprovedTemplates(opts);
  return renderTemplateListing({
    listing,
    sp,
    tab: "approved",
    emptyTitle: q ? "No templates match" : "No approved templates yet",
    emptyBody: q
      ? "Try a different search term or clear the filter."
      : "Seed the catalog or absorb an observation to populate this list.",
  });
}

async function IgnoredTab({
  sp,
  q,
  sort,
  page,
}: {
  sp: Record<string, string | string[] | undefined>;
  q: string | undefined;
  sort: string | undefined;
  page: number;
}) {
  const opts = buildTemplateOpts({ q, sort, page });
  const listing = await listIgnoredTemplates(opts);
  return renderTemplateListing({
    listing,
    sp,
    tab: "ignored",
    emptyTitle: q ? "No templates match" : "Nothing ignored yet",
    emptyBody: q
      ? "Try a different search term or clear the filter."
      : "Use Ignore on a catalog template to acknowledge it without curating.",
  });
}

function renderTemplateListing({
  listing,
  sp,
  tab,
  emptyTitle,
  emptyBody,
}: {
  listing: {
    rows: TemplateRow[];
    total: number;
    page: number;
    pageSize: number;
  };
  sp: Record<string, string | string[] | undefined>;
  tab: TabId;
  emptyTitle: string;
  emptyBody: string;
}) {
  if (listing.rows.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <TableCard
      footer={
        <Pagination
          page={listing.page}
          pageSize={listing.pageSize}
          total={listing.total}
          hrefForPage={(p) =>
            `/templates?${buildQs({ ...sp, tab, page: String(p) })}`
          }
        />
      }
    >
      <table className="w-full text-sm">
        <thead className={tableHeadClass}>
          <tr>
            <Th>Template</Th>
            <Th>Domain</Th>
            <Th>Category</Th>
            <Th>Signals</Th>
            <ThNum>Used by</ThNum>
            <Th>Updated</Th>
          </tr>
        </thead>
        <tbody>
          {listing.rows.map((row) => (
            <tr key={row.tplId} className={tableBodyRowClass}>
              <Td>
                <Link
                  href={`/templates/${row.tplId}`}
                  className="font-medium text-heading hover:text-link hover:underline"
                >
                  {row.name}
                </Link>
              </Td>
              <Td>
                <span className="stk-mono text-xs text-muted">
                  {row.domain ?? "—"}
                </span>
              </Td>
              <Td>
                <span className="text-slate text-sm">
                  {row.category ?? "—"}
                </span>
              </Td>
              <Td>
                <span className="text-xs text-muted">
                  {row.signals.join(" · ")}
                </span>
              </Td>
              <TdNum>{formatInt(row.usedByCount)}</TdNum>
              <Td>
                <span
                  className="text-muted text-xs"
                  title={row.updatedAt.toISOString()}
                >
                  {relativeTime(row.updatedAt)}
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableCard>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   helpers
   ══════════════════════════════════════════════════════════════════════ */

function buildTemplateOpts({
  q,
  sort,
  page,
}: {
  q: string | undefined;
  sort: string | undefined;
  page: number;
}): ListTemplatesOptions {
  return {
    page,
    pageSize: PAGE_SIZE,
    ...(q ? { q } : {}),
    ...(isValidTemplateSort(sort) ? { sort } : {}),
  };
}

function searchPlaceholder(tab: TabId): string {
  if (tab === "approved") return "Search approved templates…";
  if (tab === "ignored") return "Search ignored templates…";
  return "Search observations…";
}

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

function parseTab(s: string | undefined): TabId {
  if (s === "approved" || s === "ignored") return s;
  // Default + legacy aliases ("pending" was the prior tab name).
  return "observations";
}

function parseChannel(s: string | undefined): ObservationChannel | undefined {
  if (s === "manual" || s === "oauth" || s === "both") return s;
  return undefined;
}

function isValidTemplateSort(s: string | undefined): s is TemplateSort {
  return (
    s === "recent" ||
    s === "name_asc" ||
    s === "first_seen_asc" ||
    s === "used_by_desc"
  );
}

function isValidObservationSort(s: string | undefined): s is ObservationSort {
  return (
    s === "recent" ||
    s === "org_count_desc" ||
    s === "name_asc" ||
    s === "first_seen_asc"
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}
