/**
 * Org queries for the operator console.
 *
 * Schema-grounded notes:
 *   - `organizations` has no `primary_domain` column, so we derive a domain
 *     from the most-common employee email host. Good-enough first cut.
 *   - "Last active" rolls up MAX(audit_events.evt_created_at) per org.
 *   - "Lifecycle status" combines org_status + active wizard_sessions to
 *     produce the operator-relevant active/onboarding/stalled/suspended/
 *     canceled set the mockup uses. Stalled = wizard active >7 days.
 */
import { sql } from "../client";

export type LifecycleStatus =
  | "active"
  | "onboarding"
  | "stalled"
  | "suspended"
  | "canceled";

export interface OrgListRow {
  publicId: string;
  name: string;
  slug: string;
  domain: string | null;
  status: number;
  plan: number;
  registryEnabled: boolean;
  employeeCount: number;
  toolCount: number;
  openSignalCount: number;
  createdAt: Date;
  lastActiveAt: Date | null;
  lifecycleStatus: LifecycleStatus;
}

export interface ListOrgsOptions {
  q?: string;
  sort?: "newest" | "last_active" | "users_desc" | "tools_desc";
  /** Filter by lifecycle status. Used by the dashboard's "Onboarding stalled" link. */
  status?: LifecycleStatus;
  page?: number;
  pageSize?: number;
}

export interface ListOrgsResult {
  rows: OrgListRow[];
  total: number;
  page: number;
  pageSize: number;
}

const STALLED_DAYS = 7;

export async function listOrgs(
  options: ListOrgsOptions = {},
): Promise<ListOrgsResult> {
  const pageSize = Math.min(Math.max(options.pageSize ?? 25, 1), 100);
  const page = Math.max(options.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const q = (options.q ?? "").trim();
  const sort = options.sort ?? "newest";

  if (!sql) {
    return { rows: [], total: 0, page, pageSize };
  }

  // ORDER BY clause — using sql.unsafe is intentional here; values are
  // matched against a known whitelist above.
  const orderBy = (() => {
    switch (sort) {
      case "last_active":
        return sql`order by last_active_at desc nulls last, o.org_created_at desc`;
      case "users_desc":
        return sql`order by employee_count desc, o.org_created_at desc`;
      case "tools_desc":
        return sql`order by tool_count desc, o.org_created_at desc`;
      case "newest":
      default:
        return sql`order by o.org_created_at desc`;
    }
  })();

  const qPattern = q ? `%${q}%` : null;
  const status = options.status;

  // Lifecycle status filter — converts the operator-side concept into the
  // (org_status + wizard_sessions) combination it actually maps to in the
  // schema. Stalled = active wizard older than 7d; Onboarding = active wizard
  // <= 7d; Active = no active wizard AND org_status = 1; etc.
  const statusFilter = (() => {
    if (!status) return sql``;
    if (status === "suspended") return sql`and o.org_status = 3`;
    if (status === "canceled") return sql`and o.org_status = 4`;
    const wizardActive = sql`exists (
      select 1 from wizard_sessions w
      where w.wzs_org_id = o.org_id and w.wzs_status = 1
    )`;
    const wizardStalled = sql`exists (
      select 1 from wizard_sessions w
      where w.wzs_org_id = o.org_id
        and w.wzs_status = 1
        and w.wzs_started_at < now() - interval '${sql.unsafe(String(STALLED_DAYS))} days'
    )`;
    if (status === "stalled") return sql`and ${wizardStalled}`;
    if (status === "onboarding")
      return sql`and ${wizardActive} and not ${wizardStalled}`;
    // active
    return sql`and o.org_status = 1 and not ${wizardActive}`;
  })();

  // Two queries — paged rows + total count — kept simple. At our scale this
  // is fine; if the orgs table ever gets big, switch to window functions.
  const rows = await sql<RawOrgRow[]>`
    select
      o.org_id,
      o.org_public_id,
      o.org_name,
      o.org_slug,
      o.org_status,
      o.org_plan,
      o.org_registry_enabled,
      o.org_created_at,
      (
        select split_part(e.emp_primary_email, '@', 2)
        from employees e
        where e.emp_org_id = o.org_id
          and e.emp_deleted_at is null
        group by split_part(e.emp_primary_email, '@', 2)
        order by count(*) desc
        limit 1
      ) as derived_domain,
      (
        select count(*)
        from employees e
        where e.emp_org_id = o.org_id
          and e.emp_deleted_at is null
      ) as employee_count,
      (
        select count(*)
        from tools t
        where t.tol_org_id = o.org_id
          and t.tol_deleted_at is null
      ) as tool_count,
      (
        select count(*)
        from signal_instances s
        where s.sig_org_id = o.org_id
          and s.sig_status = 1
      ) as open_signal_count,
      (
        select max(e.evt_created_at)
        from audit_events e
        where e.evt_org_id = o.org_id
      ) as last_active_at,
      exists (
        select 1
        from wizard_sessions w
        where w.wzs_org_id = o.org_id
          and w.wzs_status = 1
      ) as has_active_wizard,
      exists (
        select 1
        from wizard_sessions w
        where w.wzs_org_id = o.org_id
          and w.wzs_status = 1
          and w.wzs_started_at < now() - interval '${sql.unsafe(String(STALLED_DAYS))} days'
      ) as has_stalled_wizard
    from organizations o
    where o.org_deleted_at is null
      ${qPattern ? sql`and (o.org_name ilike ${qPattern} or o.org_slug ilike ${qPattern})` : sql``}
      ${statusFilter}
    ${orderBy}
    limit ${pageSize}
    offset ${offset}
  `;

  const totalRow = await sql<{ total: string }[]>`
    select count(*)::text as total
    from organizations o
    where o.org_deleted_at is null
      ${qPattern ? sql`and (o.org_name ilike ${qPattern} or o.org_slug ilike ${qPattern})` : sql``}
      ${statusFilter}
  `;

  const total = Number(totalRow[0]?.total ?? 0);

  return {
    rows: rows.map(toOrgListRow),
    total,
    page,
    pageSize,
  };
}

export interface OrgListStats {
  totalCompanies: number;
  signedUpThisWeek: number;
  activeLastSevenDays: number;
  onboardingStalled: number;
}

export async function getOrgListStats(): Promise<OrgListStats> {
  if (!sql) {
    return {
      totalCompanies: 0,
      signedUpThisWeek: 0,
      activeLastSevenDays: 0,
      onboardingStalled: 0,
    };
  }

  const rows = await sql<
    {
      total_companies: string;
      signed_up_this_week: string;
      active_last_seven: string;
      onboarding_stalled: string;
    }[]
  >`
    with active_window as (
      select e.evt_org_id
      from audit_events e
      where e.evt_created_at > now() - interval '7 days'
      group by e.evt_org_id
    )
    select
      (select count(*) from organizations where org_deleted_at is null)::text
        as total_companies,
      (select count(*) from organizations
        where org_deleted_at is null
          and org_created_at > now() - interval '7 days')::text
        as signed_up_this_week,
      (select count(*) from active_window)::text as active_last_seven,
      (select count(distinct w.wzs_org_id)
        from wizard_sessions w
        join organizations o2 on o2.org_id = w.wzs_org_id
       where w.wzs_status = 1
         and w.wzs_started_at < now() - interval '${sql.unsafe(String(STALLED_DAYS))} days'
         and o2.org_deleted_at is null)::text
        as onboarding_stalled
  `;

  const r = rows[0];
  return {
    totalCompanies: Number(r?.total_companies ?? 0),
    signedUpThisWeek: Number(r?.signed_up_this_week ?? 0),
    activeLastSevenDays: Number(r?.active_last_seven ?? 0),
    onboardingStalled: Number(r?.onboarding_stalled ?? 0),
  };
}

export interface OrgDetail extends OrgListRow {
  timeZone: string;
  registryDisabledAt: Date | null;
  logoUrl: string | null;
  accentHex: string | null;
  updatedAt: Date;
  activeEmployeeCount: number;
  activeToolCount: number;
  departmentCount: number;
  criticalSignalCount: number;
  // Onboarding step progress (mockup checklist).
  onboarding: OnboardingProgress;
}

export interface OnboardingProgress {
  companyCreated: boolean;
  slackConnected: boolean;
  googleConnected: boolean;
  firstTemplateConfirmed: boolean;
  ownerAssigned: boolean;
}

export async function getOrgByPublicId(
  publicId: string,
): Promise<OrgDetail | null> {
  if (!sql) return null;

  const rows = await sql<RawOrgDetailRow[]>`
    select
      o.org_id,
      o.org_public_id,
      o.org_name,
      o.org_slug,
      o.org_status,
      o.org_plan,
      o.org_time_zone,
      o.org_registry_enabled,
      o.org_registry_disabled_at,
      o.org_logo_url,
      o.org_accent_hex,
      o.org_created_at,
      o.org_updated_at,
      (
        select split_part(e.emp_primary_email, '@', 2)
        from employees e
        where e.emp_org_id = o.org_id
          and e.emp_deleted_at is null
        group by split_part(e.emp_primary_email, '@', 2)
        order by count(*) desc
        limit 1
      ) as derived_domain,
      (
        select count(*) from employees e
        where e.emp_org_id = o.org_id and e.emp_deleted_at is null
      ) as employee_count,
      (
        select count(*) from employees e
        where e.emp_org_id = o.org_id
          and e.emp_deleted_at is null
          and e.emp_employment_status = 1
      ) as active_employee_count,
      (
        select count(*) from tools t
        where t.tol_org_id = o.org_id and t.tol_deleted_at is null
      ) as tool_count,
      (
        select count(*) from tools t
        where t.tol_org_id = o.org_id
          and t.tol_deleted_at is null
          and t.tol_status = 2
      ) as active_tool_count,
      (
        select count(*) from departments d
        where d.dep_org_id = o.org_id and d.dep_deleted_at is null
      ) as department_count,
      (
        select count(*) from signal_instances s
        where s.sig_org_id = o.org_id and s.sig_status = 1
      ) as open_signal_count,
      (
        select count(*) from signal_instances s
        where s.sig_org_id = o.org_id
          and s.sig_status = 1
          and s.sig_severity = 3
      ) as critical_signal_count,
      (
        select max(e.evt_created_at)
        from audit_events e
        where e.evt_org_id = o.org_id
      ) as last_active_at,
      exists (
        select 1 from wizard_sessions w
        where w.wzs_org_id = o.org_id and w.wzs_status = 1
      ) as has_active_wizard,
      exists (
        select 1 from wizard_sessions w
        where w.wzs_org_id = o.org_id
          and w.wzs_status = 1
          and w.wzs_started_at < now() - interval '${sql.unsafe(String(STALLED_DAYS))} days'
      ) as has_stalled_wizard,
      exists (
        select 1 from slack_workspaces sw
        where sw.swk_org_id = o.org_id
      ) as has_slack,
      exists (
        select 1 from tools t
        where t.tol_org_id = o.org_id
          and t.tol_deleted_at is null
          and t.tol_status = 2
      ) as has_active_tool,
      exists (
        select 1 from tool_owners ow
        join tools t on t.tol_id = ow.own_tol_id
        where t.tol_org_id = o.org_id
          and t.tol_deleted_at is null
      ) as has_owner_assignment,
      exists (
        select 1 from employees e
        where e.emp_org_id = o.org_id
          and e.emp_deleted_at is null
          and e.emp_source_type = 3
      ) as has_google_sourced_employees
    from organizations o
    where o.org_public_id = ${publicId}
      and o.org_deleted_at is null
    limit 1
  `;

  const row = rows[0];
  if (!row) return null;

  const base = toOrgListRow(row);

  return {
    ...base,
    timeZone: row.org_time_zone,
    registryDisabledAt: row.org_registry_disabled_at,
    logoUrl: row.org_logo_url,
    accentHex: row.org_accent_hex,
    updatedAt: row.org_updated_at,
    activeEmployeeCount: Number(row.active_employee_count),
    activeToolCount: Number(row.active_tool_count),
    departmentCount: Number(row.department_count),
    criticalSignalCount: Number(row.critical_signal_count),
    onboarding: {
      companyCreated: true, // org row exists
      slackConnected: row.has_slack,
      googleConnected: row.has_google_sourced_employees,
      firstTemplateConfirmed: row.has_active_tool,
      ownerAssigned: row.has_owner_assignment,
    },
  };
}

// ── helpers ───────────────────────────────────────────────────────────────

interface RawOrgRow {
  org_id: number;
  org_public_id: string;
  org_name: string;
  org_slug: string;
  org_status: number;
  org_plan: number;
  org_registry_enabled: boolean;
  org_created_at: Date;
  derived_domain: string | null;
  employee_count: string;
  tool_count: string;
  open_signal_count: string;
  last_active_at: Date | null;
  has_active_wizard: boolean;
  has_stalled_wizard: boolean;
}

interface RawOrgDetailRow extends RawOrgRow {
  org_time_zone: string;
  org_registry_disabled_at: Date | null;
  org_logo_url: string | null;
  org_accent_hex: string | null;
  org_updated_at: Date;
  active_employee_count: string;
  active_tool_count: string;
  department_count: string;
  critical_signal_count: string;
  has_slack: boolean;
  has_active_tool: boolean;
  has_owner_assignment: boolean;
  has_google_sourced_employees: boolean;
}

function toOrgListRow(r: RawOrgRow): OrgListRow {
  return {
    publicId: r.org_public_id,
    name: r.org_name,
    slug: r.org_slug,
    domain: r.derived_domain,
    status: r.org_status,
    plan: r.org_plan,
    registryEnabled: r.org_registry_enabled,
    employeeCount: Number(r.employee_count),
    toolCount: Number(r.tool_count),
    openSignalCount: Number(r.open_signal_count),
    createdAt: r.org_created_at,
    lastActiveAt: r.last_active_at,
    lifecycleStatus: deriveLifecycle(
      r.org_status,
      r.has_active_wizard,
      r.has_stalled_wizard,
    ),
  };
}

function deriveLifecycle(
  orgStatus: number,
  hasActiveWizard: boolean,
  hasStalledWizard: boolean,
): LifecycleStatus {
  if (orgStatus === 3) return "suspended";
  if (orgStatus === 4) return "canceled";
  if (hasStalledWizard) return "stalled";
  if (hasActiveWizard) return "onboarding";
  return "active";
}
