import Link from "next/link";
import { dbConfigured } from "@/lib/db/client";
import {
  getOrgListStats,
  listOrgs,
  type LifecycleStatus,
  type ListOrgsOptions,
} from "@/lib/db/queries/orgs";
import { ORG_PLAN, labelFor } from "@/lib/enums";
import { formatInt, relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { LifecyclePill } from "@/components/LifecyclePill";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { SortSelect } from "@/components/ui/SortSelect";
import {
  Button,
  CellAvatar,
  CellMono,
  CellNumber,
  KPI,
  KPIGrid,
  PageHead,
  Table,
} from "@/components/backstage";

export const dynamic = "force-dynamic";

const SORT_OPTIONS = [
  { value: "newest", label: "Sort: Newest signup" },
  { value: "last_active", label: "Last active" },
  { value: "users_desc", label: "# users" },
  { value: "tools_desc", label: "# tools detected" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active only" },
  { value: "onboarding", label: "Onboarding" },
  { value: "stalled", label: "Stalled" },
  { value: "suspended", label: "Suspended" },
  { value: "canceled", label: "Canceled" },
];

const PAGE_SIZE = 25;

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CompaniesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = strFromSp(sp.q);
  const sort = strFromSp(sp.sort);
  const status = strFromSp(sp.status);
  const page = Math.max(1, Number.parseInt(strFromSp(sp.page) ?? "1", 10) || 1);

  const opts: ListOrgsOptions = {
    pageSize: PAGE_SIZE,
    page,
    ...(q ? { q } : {}),
    ...(isValidSort(sort) ? { sort } : {}),
    ...(isValidStatus(status) ? { status } : {}),
  };

  const [listing, stats] = await Promise.all([
    listOrgs(opts),
    dbConfigured ? getOrgListStats() : Promise.resolve(null),
  ]);

  const hrefForPage = (p: number) =>
    `/companies?${buildQs({ ...sp, page: String(p) })}`;

  const subtitle = stats
    ? `${formatInt(stats.totalCompanies)} total · ${formatInt(stats.activeLastSevenDays)} active (7d) · ${formatInt(stats.onboardingStalled)} stalled`
    : "Operator console";

  return (
    <div className="px-9 pt-7 pb-9">
      <PageHead
        title="Companies"
        subtitle={subtitle}
        controls={
          <>
            <SearchInput placeholder="Search companies…" />
            <SortSelect
              options={STATUS_OPTIONS}
              defaultValue=""
              param="status"
            />
            <SortSelect options={SORT_OPTIONS} defaultValue="newest" />
            <Button variant="primary" disabled title="Companies sign up via the app">
              + New company
            </Button>
          </>
        }
      />

      {stats && (
        <KPIGrid>
          <KPI
            label="Total companies"
            value={formatInt(stats.totalCompanies)}
            subValue={`${formatInt(stats.signedUpThisWeek)} signed up this week`}
          />
          <KPI
            label="Active (7d)"
            value={formatInt(stats.activeLastSevenDays)}
            subValue="any audit event in last 7 days"
          />
          <KPI
            label="Signups (7d)"
            value={formatInt(stats.signedUpThisWeek)}
            subValue="new orgs in last 7 days"
          />
          <KPI
            label="Onboarding stalled"
            value={formatInt(stats.onboardingStalled)}
            subValue="wizard active >7d"
            tone="warn"
          />
        </KPIGrid>
      )}

      {!dbConfigured ? (
        <EmptyState
          title="Database not configured"
          body={
            <>
              Set <code className="stk-mono">DATABASE_URL_DIRECT</code> in
              <code className="stk-mono"> .env.local</code> and restart the dev server.
            </>
          }
        />
      ) : listing.rows.length === 0 ? (
        <EmptyState
          title={
            q
              ? "No companies match"
              : status
                ? `No ${status} companies`
                : "No companies yet"
          }
          body={
            q
              ? "Try a different search term or clear the filter."
              : status
                ? "Try clearing the status filter or adjusting search."
                : "Once a company signs up via the Stacktic app, they'll appear here."
          }
        />
      ) : (
        <Table
          cols="1.6fr 1fr .8fr .55fr .55fr .8fr .8fr"
          rows={listing.rows}
          rowKey={(r) => r.publicId}
          columns={[
            {
              key: "name",
              header: "Company",
              render: (r) => (
                <Link
                  href={`/companies/${r.publicId}` as never}
                  className="block min-w-0 hover:[&_.nm]:text-teal"
                >
                  <CellAvatar name={r.name} />
                </Link>
              ),
            },
            {
              key: "id",
              header: "Org ID · Domain",
              render: (r) => (
                <div className="flex flex-col gap-0.5 min-w-0">
                  <CellMono tone="muted">{r.publicId}</CellMono>
                  <span className="font-mono text-[11.5px] text-muted-2 truncate">
                    {r.domain ?? "—"}
                  </span>
                </div>
              ),
            },
            {
              key: "plan",
              header: "Plan",
              render: (r) => <CellMono>{labelFor(ORG_PLAN, r.plan)}</CellMono>,
            },
            {
              key: "users",
              header: "Users",
              align: "right",
              render: (r) => <CellNumber>{formatInt(r.employeeCount)}</CellNumber>,
            },
            {
              key: "tools",
              header: "Tools",
              align: "right",
              render: (r) => <CellNumber>{formatInt(r.toolCount)}</CellNumber>,
            },
            {
              key: "last",
              header: "Last active",
              align: "right",
              render: (r) => (
                <CellMono tone="muted">
                  <span title={r.lastActiveAt?.toISOString() ?? undefined}>
                    {r.lastActiveAt ? relativeTime(r.lastActiveAt) : "—"}
                  </span>
                </CellMono>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => <LifecyclePill status={r.lifecycleStatus} />,
            },
          ]}
          footer={
            <Pagination
              page={listing.page}
              pageSize={listing.pageSize}
              total={listing.total}
              hrefForPage={hrefForPage}
            />
          }
        />
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

function isValidSort(s: string | undefined): s is ListOrgsOptions["sort"] {
  return (
    s === "newest" ||
    s === "last_active" ||
    s === "users_desc" ||
    s === "tools_desc"
  );
}

function isValidStatus(s: string | undefined): s is LifecycleStatus {
  return (
    s === "active" ||
    s === "onboarding" ||
    s === "stalled" ||
    s === "suspended" ||
    s === "canceled"
  );
}
