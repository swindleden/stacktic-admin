import Link from "next/link";
import { dbConfigured } from "@/lib/db/client";
import {
  listOrgs,
  type LifecycleStatus,
  type ListOrgsOptions,
} from "@/lib/db/queries/orgs";
import { ORG_PLAN, labelFor } from "@/lib/enums";
import { formatDate, formatInt, relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { LifecyclePill } from "@/components/LifecyclePill";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { SortSelect } from "@/components/ui/SortSelect";
import {
  TableCard,
  Td,
  TdNum,
  Th,
  ThNum,
  tableBodyRowClass,
  tableHeadClass,
} from "@/components/ui/TableCard";

export const dynamic = "force-dynamic";

const SORT_OPTIONS = [
  { value: "newest", label: "Sort: Newest signup" },
  { value: "last_active", label: "Last active" },
  { value: "users_desc", label: "# users" },
  { value: "tools_desc", label: "# tools detected" },
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

  const listing = await listOrgs(opts);

  const hrefForPage = (p: number) =>
    `/companies?${buildQs({ ...sp, page: String(p) })}`;

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 bg-surface border-b border-border-soft px-8 py-5 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold text-heading">Companies</h1>
          <p className="text-sm text-muted">
            All organizations on Stacktic, newest first.
            {status ? (
              <>
                {" "}
                Filtered by{" "}
                <span className="text-slate font-medium">{status}</span>.{" "}
                <Link
                  href={`/companies?${buildQs({ ...sp, status: undefined, page: undefined })}`}
                  className="text-link hover:underline"
                >
                  clear filter
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput placeholder="Search by name or domain…" />
          <SortSelect options={SORT_OPTIONS} defaultValue="newest" />
        </div>
      </header>

      <div className="px-8 py-6">
        {!dbConfigured ? (
          <EmptyState
            title="Database not configured"
            body={
              <>
                Set <code className="stk-mono">DATABASE_URL_DIRECT</code> in
                <code className="stk-mono"> .env.local</code> and restart the dev
                server.
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
          <TableCard
            footer={
              <Pagination
                page={listing.page}
                pageSize={listing.pageSize}
                total={listing.total}
                hrefForPage={hrefForPage}
              />
            }
          >
            <table className="w-full text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <Th>Company</Th>
                  <Th>Domain</Th>
                  <Th>Plan</Th>
                  <ThNum>Users</ThNum>
                  <ThNum>Tools</ThNum>
                  <Th>Signed up</Th>
                  <Th>Last active</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {listing.rows.map((row) => (
                  <tr key={row.publicId} className={tableBodyRowClass}>
                    <Td>
                      <Link
                        href={`/companies/${row.publicId}`}
                        className="text-heading font-medium hover:text-link"
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
                      <span className="stk-mono text-xs text-muted">
                        {labelFor(ORG_PLAN, row.plan)}
                      </span>
                    </Td>
                    <TdNum>{formatInt(row.employeeCount)}</TdNum>
                    <TdNum>{formatInt(row.toolCount)}</TdNum>
                    <Td>
                      <span className="text-muted text-sm">
                        {formatDate(row.createdAt)}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className="text-muted-light text-xs"
                        title={
                          row.lastActiveAt
                            ? row.lastActiveAt.toISOString()
                            : undefined
                        }
                      >
                        {row.lastActiveAt
                          ? relativeTime(row.lastActiveAt)
                          : "—"}
                      </span>
                    </Td>
                    <Td>
                      <LifecyclePill status={row.lifecycleStatus} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </div>
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
