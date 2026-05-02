import Link from "next/link";
import { dbConfigured } from "@/lib/db/client";
import { getOrgListStats } from "@/lib/db/queries/orgs";
import { countOpenProblems } from "@/lib/db/queries/problems";
import { getObservationsCounts } from "@/lib/db/queries/observations";
import {
  getTemplatesDashboardStats,
  topUsedApprovedTemplates,
} from "@/lib/db/queries/templates";
import { formatInt } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
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

export const dynamic = "force-dynamic";

/**
 * Operator landing. Two scoreboards (Companies + Templates) plus a Top-10
 * most-used list. Every stat card links into the underlying list view with
 * the appropriate filter or sort applied — the dashboard is the entry point,
 * not a dead end.
 */
export default async function DashboardPage() {
  const [orgStats, tplStats, obsCounts, top, openProblems] = await Promise.all(
    [
      getOrgListStats(),
      getTemplatesDashboardStats(),
      getObservationsCounts(),
      topUsedApprovedTemplates(10),
      countOpenProblems(),
    ],
  );

  return (
    <div className="px-9 pt-7 pb-9">
      <PageHead
        title="Dashboard"
        subtitle="Operator landing · click any number to drill into the underlying list"
      />

      {!dbConfigured ? (
        <EmptyState
          title="Database not configured"
          body={
            <>
              Set <code className="stk-mono">DATABASE_URL_DIRECT</code> in
              <code className="stk-mono"> .env.local</code> and restart the dev
              server. Once connected, this page becomes your daily landing.
            </>
          }
        />
      ) : (
        <div className="space-y-8">
          {openProblems > 0 ? (
            <Section title="Triage queue">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <StatCard
                  label="Open problems"
                  value={formatInt(openProblems)}
                  href="/problems?tab=active"
                  sub="customer-reported template issues"
                  tone="warn"
                />
              </div>
            </Section>
          ) : null}

          <Section title="Companies">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <StatCard
                label="Total companies"
                value={formatInt(orgStats.totalCompanies)}
                href="/companies"
              />
              <StatCard
                label="Signed up this week"
                value={formatInt(orgStats.signedUpThisWeek)}
                href="/companies?sort=newest"
              />
              <StatCard
                label="Active in last 7d"
                value={formatInt(orgStats.activeLastSevenDays)}
                href="/companies?sort=last_active"
              />
              <StatCard
                label="Onboarding stalled"
                value={formatInt(orgStats.onboardingStalled)}
                href="/companies?status=stalled"
                tone={orgStats.onboardingStalled > 0 ? "warn" : "neutral"}
              />
            </div>
          </Section>

          <Section title="Templates">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <StatCard
                label="Pending observations"
                value={formatInt(obsCounts.pending)}
                href="/templates?tab=observations"
                sub="customer-detected names awaiting your triage"
                tone={obsCounts.pending > 0 ? "warn" : "neutral"}
              />
              <StatCard
                label="Approved templates"
                value={formatInt(tplStats.approved)}
                href="/templates?tab=approved"
              />
              <StatCard
                label="Created in last 7d"
                value={formatInt(tplStats.createdLastSevenDays)}
                href="/templates?tab=approved&sort=recent"
              />
            </div>
          </Section>

          <Section
            title="Top 10 most-used approved templates"
            subtitle="By distinct customer orgs with a live tool pointing at the template (any state except Deleted / Archived)."
            right={
              <Link
                href="/templates?tab=approved"
                className="font-mono text-[11.5px] text-muted hover:text-ink"
              >
                view all →
              </Link>
            }
          >
            {top.length === 0 ? (
              <EmptyState
                title="No usage yet"
                body="As customers wire up templates, the most popular will appear here."
              />
            ) : (
              <TableCard>
                <table className="w-full">
                  <thead className={tableHeadClass}>
                    <tr>
                      <ThNum>#</ThNum>
                      <Th>Template</Th>
                      <Th>Domain</Th>
                      <Th>Category</Th>
                      <ThNum>Used by</ThNum>
                    </tr>
                  </thead>
                  <tbody>
                    {top.map((row, i) => (
                      <tr key={row.tplId} className={tableBodyRowClass}>
                        <TdNum>
                          <span className="text-muted-2">{i + 1}</span>
                        </TdNum>
                        <Td>
                          <span className="font-semibold text-ink tracking-[-0.005em]">
                            {row.name}
                          </span>
                        </Td>
                        <Td>
                          <CellMono tone="muted">{row.domain ?? "—"}</CellMono>
                        </Td>
                        <Td>
                          <span className="text-[13px] text-ink-2">{row.category ?? "—"}</span>
                        </Td>
                        <TdNum>{formatInt(row.usedByCount)}</TdNum>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-3.5">
        <div>
          <h2 className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-muted font-medium">{title}</h2>
          {subtitle ? (
            <p className="text-[12.5px] text-ink-2 mt-1.5 max-w-3xl tracking-[-0.005em] leading-[1.5]">{subtitle}</p>
          ) : null}
        </div>
        {right ? right : null}
      </div>
      {children}
    </section>
  );
}
