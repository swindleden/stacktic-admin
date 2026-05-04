import { notFound } from "next/navigation";
import { dbConfigured } from "@/lib/db/client";
import { listAuditEvents } from "@/lib/db/queries/audit";
import { getOrgByPublicId, type OnboardingProgress } from "@/lib/db/queries/orgs";
import { ORG_PLAN, labelFor } from "@/lib/enums";
import { formatDate, formatInt, relativeTime } from "@/lib/format";
import { AdminActionsCard } from "./AdminActionsCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LifecyclePill } from "@/components/LifecyclePill";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import {
  ActivityList,
  Breadcrumbs,
  Button,
  Checklist,
  DetailAvatar,
  DetailHeader,
  FieldList,
  KPI,
  KPIGrid,
  Panel,
  PanelBody,
  PanelHeader,
  type ActivityItem,
  type ChecklistItem,
} from "@/components/backstage";

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
      <Frame>
        <EmptyState
          title="Database not configured"
          body="Configure DATABASE_URL to view company profiles."
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
    <Frame>
      <Breadcrumbs
        items={[
          { label: "Companies", href: "/companies" },
          { label: org.name },
        ]}
      />

      <DetailHeader
        avatar={<DetailAvatar name={org.name} />}
        title={org.name}
        pill={<LifecyclePill status={org.lifecycleStatus} />}
        id={org.publicId}
        controls={
          <>
            <Button variant="default">Impersonate owner</Button>
            <Button variant="default">Edit company</Button>
          </>
        }
      />

      <KPIGrid>
        <KPI
          label="Users"
          value={formatInt(org.employeeCount)}
          subValue={`${formatInt(org.activeEmployeeCount)} active`}
        />
        <KPI
          label="Tools"
          value={formatInt(org.toolCount)}
          subValue={`${formatInt(org.activeToolCount)} active`}
        />
        <KPI
          label="Cost (30d)"
          value={<span className="text-muted-2">—</span>}
          subValue="cost signals — Phase 2"
        />
        <KPI
          label="Open signals"
          value={formatInt(org.openSignalCount)}
          subValue={
            org.criticalSignalCount > 0
              ? `${formatInt(org.criticalSignalCount)} critical`
              : "none critical"
          }
          tone={org.criticalSignalCount > 0 ? "warn" : "default"}
        />
      </KPIGrid>

      <Tabs tabs={TABS} active={tab} />

      {tab === "overview" ? (
        <OverviewTab org={org} recentEvents={recentEvents} />
      ) : (
        <EmptyState
          title={`${TABS.find((t) => t.id === tab)?.label ?? "Tab"} — coming soon`}
          body="This tab is scaffolded but not built out yet. Pulling it together in a follow-up pass."
        />
      )}
    </Frame>
  );
}

function OverviewTab({
  org,
  recentEvents,
}: {
  org: NonNullable<Awaited<ReturnType<typeof getOrgByPublicId>>>;
  recentEvents: Awaited<ReturnType<typeof listAuditEvents>>;
}) {
  const accountFields = [
    { label: "Company ID", value: org.publicId, mono: true },
    { label: "Primary domain", value: org.domain ?? "—", mono: true },
    { label: "Slug", value: org.slug, mono: true },
    { label: "Signed up", value: formatDate(org.createdAt) },
    { label: "Plan", value: labelFor(ORG_PLAN, org.plan) },
    { label: "Time zone", value: org.timeZone },
    {
      label: "Registry",
      value: org.registryEnabled
        ? "enabled"
        : org.registryDisabledAt
          ? `disabled · ${formatDate(org.registryDisabledAt)}`
          : "disabled",
    },
    {
      label: "Last active",
      value: org.lastActiveAt ? (
        <span title={org.lastActiveAt.toISOString()}>
          {relativeTime(org.lastActiveAt)}
        </span>
      ) : (
        <span className="text-muted-2">—</span>
      ),
    },
  ];

  const activityItems: ActivityItem[] = recentEvents.slice(0, 8).map((evt) => ({
    event: evt.action,
    scope: evt.entityType ?? undefined,
    actor: evt.actorEmail ?? undefined,
    at: relativeTime(evt.createdAt),
    atTitle: evt.createdAt.toISOString(),
  }));

  const checklist = onboardingChecklist(org.onboarding);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3.5">
      <div className="flex flex-col gap-3.5 min-w-0">
        <Panel>
          <PanelHeader title="Account" />
          <PanelBody>
            <FieldList fields={accountFields} />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Recent activity" hint={`${recentEvents.length} events`} />
          <PanelBody>
            <ActivityList
              items={activityItems}
              max={6}
              empty={<>no audit events yet for this company</>}
            />
          </PanelBody>
        </Panel>
      </div>

      <div className="flex flex-col gap-3.5 min-w-0">
        <Panel>
          <PanelHeader title="Onboarding" hint={`${doneCount(checklist)} / ${checklist.length}`} />
          <PanelBody>
            <Checklist items={checklist} />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Admin actions" />
          <PanelBody>
            <AdminActionsCard publicId={org.publicId} />
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

function onboardingChecklist(p: OnboardingProgress): ChecklistItem[] {
  return [
    { label: "Company created", done: p.companyCreated },
    { label: "Slack connected", done: p.slackConnected },
    { label: "Google Workspace connected", done: p.googleConnected },
    { label: "First tool template confirmed", done: p.firstTemplateConfirmed },
    { label: "Owner assigned to ≥1 tool", done: p.ownerAssigned },
  ];
}

function doneCount(items: ChecklistItem[]): number {
  return items.filter((i) => i.done).length;
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="px-9 pt-7 pb-9">{children}</div>;
}
