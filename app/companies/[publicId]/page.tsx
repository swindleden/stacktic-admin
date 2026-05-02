import Link from "next/link";
import { notFound } from "next/navigation";
import { dbConfigured } from "@/lib/db/client";
import { listAuditEvents } from "@/lib/db/queries/audit";
import { getOrgByPublicId, type OnboardingProgress } from "@/lib/db/queries/orgs";
import { ORG_PLAN, labelFor } from "@/lib/enums";
import { formatDate, formatInt, relativeTime } from "@/lib/format";
import { AdminActionsCard } from "./AdminActionsCard";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { LifecyclePill } from "@/components/LifecyclePill";
import { StatCard } from "@/components/ui/StatCard";
import { Tabs, type TabItem } from "@/components/ui/Tabs";

export const dynamic = "force-dynamic";

const TABS: TabItem[] = [
  { id: "overview", label: "Overview" },
  { id: "tools", label: "Tools" },
  { id: "users", label: "Users" },
  { id: "integrations", label: "Integrations" },
  { id: "activity", label: "Activity" },
  { id: "billing", label: "Billing" },
];

interface Props {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function CompanyProfilePage({
  params,
  searchParams,
}: Props) {
  const { publicId } = await params;
  const { tab = "overview" } = await searchParams;

  if (!dbConfigured) {
    return (
      <Frame title="Company">
        <EmptyState
          title="Database not configured"
          body="Configure DATABASE_URL_DIRECT to view company profiles."
        />
      </Frame>
    );
  }

  const org = await getOrgByPublicId(publicId);
  if (!org) notFound();

  const recentEvents = await listAuditEvents({
    orgPublicId: publicId,
    limit: 25,
  });

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 bg-surface border-b border-border-soft px-8 py-5">
        <div className="text-xs text-muted mb-1">
          <Link href="/companies" className="hover:text-slate hover:underline">
            Companies
          </Link>{" "}
          / <span className="text-slate">{org.name}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Avatar name={org.name} />
            <div>
              <h1 className="text-xl font-semibold text-heading flex items-center gap-3">
                {org.name}
                <LifecyclePill status={org.lifecycleStatus} />
              </h1>
              <div className="text-sm text-muted">
                <span className="stk-mono">{org.domain ?? "—"}</span> ·{" "}
                {labelFor(ORG_PLAN, org.plan)}
              </div>
            </div>
          </div>
          <div className="stk-mono text-[11px] text-muted-light">
            {org.publicId}
          </div>
        </div>
      </header>

      <div className="px-8 py-6">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Users in directory"
            value={formatInt(org.employeeCount)}
            sub={`${formatInt(org.activeEmployeeCount)} active`}
          />
          <StatCard
            label="Tools detected"
            value={formatInt(org.toolCount)}
            sub={`${formatInt(org.activeToolCount)} active`}
          />
          <StatCard
            label="Annual stack cost"
            value="—"
            sub="cost signals — Phase 2"
          />
          <StatCard
            label="Open signals"
            value={formatInt(org.openSignalCount)}
            sub={
              org.criticalSignalCount > 0
                ? `${formatInt(org.criticalSignalCount)} critical`
                : "none critical"
            }
            tone={
              org.criticalSignalCount > 0
                ? "bad"
                : org.openSignalCount > 0
                  ? "warn"
                  : "neutral"
            }
          />
        </section>

        <div className="mb-4">
          <Tabs tabs={TABS} active={tab} />
        </div>

        {tab === "overview" ? (
          <OverviewTab org={org} recentEvents={recentEvents} />
        ) : (
          <EmptyState
            title={`${TABS.find((t) => t.id === tab)?.label ?? "Tab"} — coming soon`}
            body="This tab is scaffolded but not built out yet. Pulling it together in a follow-up pass."
          />
        )}
      </div>
    </div>
  );
}

function OverviewTab({
  org,
  recentEvents,
}: {
  org: NonNullable<Awaited<ReturnType<typeof getOrgByPublicId>>>;
  recentEvents: Awaited<ReturnType<typeof listAuditEvents>>;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-surface border border-border rounded-md p-5 shadow-stk-sm">
          <h3 className="text-sm font-semibold text-heading mb-3">Account</h3>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <Dt>Company ID</Dt>
            <Dd>
              <span className="stk-mono text-xs">{org.publicId}</span>
            </Dd>
            <Dt>Primary domain</Dt>
            <Dd>
              <span className="stk-mono text-xs">{org.domain ?? "—"}</span>
            </Dd>
            <Dt>Slug</Dt>
            <Dd>
              <span className="stk-mono text-xs">{org.slug}</span>
            </Dd>
            <Dt>Signed up</Dt>
            <Dd>{formatDate(org.createdAt)}</Dd>
            <Dt>Plan</Dt>
            <Dd>{labelFor(ORG_PLAN, org.plan)}</Dd>
            <Dt>Time zone</Dt>
            <Dd>{org.timeZone}</Dd>
            <Dt>Registry</Dt>
            <Dd>
              {org.registryEnabled
                ? "enabled"
                : org.registryDisabledAt
                  ? `disabled · ${formatDate(org.registryDisabledAt)}`
                  : "disabled"}
            </Dd>
            <Dt>Last active</Dt>
            <Dd>
              {org.lastActiveAt ? (
                <span title={org.lastActiveAt.toISOString()}>
                  {relativeTime(org.lastActiveAt)}
                </span>
              ) : (
                <span className="text-muted-light">—</span>
              )}
            </Dd>
          </dl>
        </div>

        <div className="bg-surface border border-border rounded-md p-5 shadow-stk-sm">
          <h3 className="text-sm font-semibold text-heading mb-3">
            Recent activity
          </h3>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted">
              No audit events yet for this company.
            </p>
          ) : (
            <ul className="text-sm divide-y divide-border-soft">
              {recentEvents.slice(0, 8).map((evt) => (
                <li key={evt.id} className="py-2 flex justify-between gap-4">
                  <span className="text-slate">
                    <span className="stk-mono text-xs">{evt.action}</span>
                    {evt.entityType ? (
                      <span className="text-muted-light">
                        {" "}
                        · {evt.entityType}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className="stk-mono text-xs text-muted-light shrink-0"
                    title={evt.createdAt.toISOString()}
                  >
                    {relativeTime(evt.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <OnboardingCard onboarding={org.onboarding} />
        <AdminActionsCard publicId={org.publicId} />
      </div>
    </div>
  );
}

function OnboardingCard({ onboarding }: { onboarding: OnboardingProgress }) {
  const items: Array<{ key: keyof OnboardingProgress; label: string }> = [
    { key: "companyCreated", label: "Company created" },
    { key: "slackConnected", label: "Slack connected" },
    { key: "googleConnected", label: "Google Workspace connected" },
    { key: "firstTemplateConfirmed", label: "First tool template confirmed" },
    { key: "ownerAssigned", label: "Owner assigned to ≥1 tool" },
  ];

  return (
    <div className="bg-surface border border-border rounded-md p-5 shadow-stk-sm">
      <h3 className="text-sm font-semibold text-heading mb-3">Onboarding</h3>
      <ul className="text-sm space-y-2">
        {items.map((item) => {
          const done = onboarding[item.key];
          return (
            <li
              key={item.key}
              className={[
                "flex items-center gap-2",
                done ? "text-slate" : "text-muted-light",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={
                  done ? "text-success-text" : "text-muted-light"
                }
              >
                {done ? "✓" : "○"}
              </span>
              {item.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Dt({ children }: { children: React.ReactNode }) {
  return <dt className="text-muted">{children}</dt>;
}
function Dd({ children }: { children: React.ReactNode }) {
  return <dd className="text-slate">{children}</dd>;
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
