/**
 * Template queries for the Backstage operator console.
 *
 * Two tabs (post-catalog/observations refactor):
 *
 *   Approved — operator-curated catalog. WHERE tpl_status = Active(1).
 *              The bulk of the catalog. Includes Seed (loaded via
 *              `pnpm seed`) and any rows the operator promoted from
 *              an observation in the absorb-on-catalog flow.
 *
 *   Ignored  — operator-acknowledged catalog rows that won't get
 *              curation work. WHERE tpl_status = Ignored(2). Still
 *              match via aliases — they're not invisible to customer
 *              detection, just hidden from the operator's review queue.
 *
 * The third tab — Observations — reads from `tool_observations` via
 * the queries in `./observations.ts`. Operator triage of unmatched
 * names lives there, not here.
 *
 * `usedByCount` = distinct orgs with a live tool pointing at the
 * template. "Live" = `tol_status NOT IN (4, 5)` (excludes Deleted +
 * Archived). Pending, DetectedUnreviewed, Active, Personal all count.
 *
 * Schema source of truth: `site-app/lib/db/enums.ts`
 *   - `ToolTemplateStatus` Active=1 | Ignored=2
 */
import { sql } from "../client";

const DEFAULT_PAGE_SIZE = 25;

// Enum values pinned to the Stacktic schema. Don't import from
// site-app — keep site-admin's DB layer self-contained. If these
// drift from site-app/lib/db/enums.ts the stacktic_enum_reference
// doc is the tiebreaker.
const STATUS_APPROVED = 1;
const STATUS_IGNORED = 2;

/* ══════════════════════════════════════════════════════════════════════
   Counts
   ══════════════════════════════════════════════════════════════════════ */

export interface TemplatesCounts {
  approved: number;
  ignored: number;
}

export async function getTemplatesCounts(): Promise<TemplatesCounts> {
  if (!sql) return { approved: 0, ignored: 0 };

  const rows = await sql<{ approved: string; ignored: string }[]>`
    select
      (select count(*) from tool_templates
        where tpl_status = ${STATUS_APPROVED})::text as approved,
      (select count(*) from tool_templates
        where tpl_status = ${STATUS_IGNORED})::text as ignored
  `;
  const r = rows[0];
  return {
    approved: Number(r?.approved ?? 0),
    ignored: Number(r?.ignored ?? 0),
  };
}

/* ══════════════════════════════════════════════════════════════════════
   Dashboard stats
   ══════════════════════════════════════════════════════════════════════ */

export interface TemplatesDashboardStats extends TemplatesCounts {
  /** Catalog rows created in the last 7 days (operator activity signal). */
  createdLastSevenDays: number;
}

export async function getTemplatesDashboardStats(): Promise<TemplatesDashboardStats> {
  if (!sql) {
    return { approved: 0, ignored: 0, createdLastSevenDays: 0 };
  }

  const rows = await sql<
    {
      approved: string;
      ignored: string;
      created_last_seven: string;
    }[]
  >`
    select
      (select count(*) from tool_templates
        where tpl_status = ${STATUS_APPROVED})::text as approved,
      (select count(*) from tool_templates
        where tpl_status = ${STATUS_IGNORED})::text as ignored,
      (select count(*) from tool_templates
        where tpl_created_at > now() - interval '7 days')::text
        as created_last_seven
  `;
  const r = rows[0];
  return {
    approved: Number(r?.approved ?? 0),
    ignored: Number(r?.ignored ?? 0),
    createdLastSevenDays: Number(r?.created_last_seven ?? 0),
  };
}

/* ══════════════════════════════════════════════════════════════════════
   Top-10 dashboard list
   ══════════════════════════════════════════════════════════════════════ */

export interface TopUsedTemplateRow {
  tplId: number;
  name: string;
  domain: string | null;
  category: string | null;
  usedByCount: number;
}

/**
 * Top N most-used Approved templates by distinct customer-org reach.
 * Ignored templates intentionally don't appear on this dashboard list
 * (operator decided not to curate them). Within Approved, "used by"
 * counts any live customer tool — Pending, DetectedUnreviewed, Active,
 * Personal — so a Pending tool in 50 customer stacks ranks above an
 * Active tool in 5.
 */
export async function topUsedApprovedTemplates(
  limit = 10,
): Promise<TopUsedTemplateRow[]> {
  if (!sql) return [];
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  const rows = await sql<
    {
      tpl_id: number;
      tpl_name: string;
      tpl_domain: string | null;
      tpl_category_hint: string | null;
      used_by: string;
    }[]
  >`
    select
      t.tpl_id,
      t.tpl_name,
      t.tpl_domain,
      t.tpl_category_hint,
      (
        select count(distinct ti.tol_org_id)
        from tools ti
        where ti.tol_tpl_id = t.tpl_id
          and ti.tol_deleted_at is null
          and ti.tol_status not in (4, 5)
      ) as used_by
    from tool_templates t
    where t.tpl_status = ${STATUS_APPROVED}
    order by used_by desc, t.tpl_name asc
    limit ${safeLimit}
  `;

  return rows.map((r) => ({
    tplId: Number(r.tpl_id),
    name: r.tpl_name,
    domain: r.tpl_domain,
    category: r.tpl_category_hint,
    usedByCount: Number(r.used_by),
  }));
}

/* ══════════════════════════════════════════════════════════════════════
   Shared row + paging types
   ══════════════════════════════════════════════════════════════════════ */

export interface TemplateRow {
  tplId: number;
  name: string;
  slug: string;
  domain: string | null;
  vendorName: string | null;
  category: string | null;
  /** Distinct orgs with a live tool pointing at this template. Live =
   *  not Deleted (4) and not Archived (5). */
  usedByCount: number;
  /** Capability surface used to derive the "Signals" column. */
  signals: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PagedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type TemplateSort =
  | "recent"
  | "name_asc"
  | "first_seen_asc"
  | "used_by_desc";

export interface ListTemplatesOptions {
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: TemplateSort;
}

interface RawTemplateRow {
  tpl_id: number;
  tpl_name: string;
  tpl_slug: string;
  tpl_domain: string | null;
  tpl_vendor_name: string | null;
  tpl_category_hint: string | null;
  tpl_supports_sso: boolean;
  tpl_supports_scim: boolean;
  tpl_supports_invoice_ingestion: boolean;
  used_by: string;
  tpl_created_at: Date;
  tpl_updated_at: Date;
}

/* ══════════════════════════════════════════════════════════════════════
   Single-template detail (editor)
   ══════════════════════════════════════════════════════════════════════ */

export interface TemplateDetail {
  tplId: number;
  // Identity
  name: string;
  slug: string;
  vendorName: string | null;
  domain: string | null;
  categoryHint: string | null;
  // About
  description: string | null;
  iconUrl: string | null;
  // URLs
  loginUrl: string | null;
  docsUrl: string | null;
  statusPageUrl: string | null;
  statusFeedUrl: string | null;
  apiBaseUrl: string | null;
  // Capabilities
  authType: number | null;
  supportsSso: boolean;
  supportsScim: boolean;
  supportsWebhooks: boolean;
  supportsApi: boolean;
  supportsInvoiceIngestion: boolean;
  mcpSupported: boolean;
  intrinsicScope: number | null;
  // Lifecycle
  status: number;
  // AI metadata (read-only in the editor)
  aiName: string | null;
  aiConfidence: number | null;
  enrichedAt: Date | null;
  enrichmentSource: string | null;
  enrichmentPromptVersion: number | null;
  // Audit
  createdAt: Date;
  updatedAt: Date;
  // Cross-references
  /** Distinct customer orgs with a live tool pointing at this template.
   *  Live = not Deleted (4) and not Archived (5). */
  usedByCount: number;
  /** Open + Acknowledged customer-reported problems for this template. */
  openProblemsCount: number;
}

interface RawTemplateDetailRow {
  tpl_id: number;
  tpl_name: string;
  tpl_slug: string;
  tpl_vendor_name: string | null;
  tpl_domain: string | null;
  tpl_category_hint: string | null;
  tpl_description: string | null;
  tpl_icon_url: string | null;
  tpl_login_url: string | null;
  tpl_docs_url: string | null;
  tpl_status_page_url: string | null;
  tpl_status_feed_url: string | null;
  tpl_api_base_url: string | null;
  tpl_auth_type: number | null;
  tpl_supports_sso: boolean;
  tpl_supports_scim: boolean;
  tpl_supports_webhooks: boolean;
  tpl_supports_api: boolean;
  tpl_supports_invoice_ingestion: boolean;
  tpl_mcp_supported: boolean;
  tpl_intrinsic_scope: number | null;
  tpl_status: number;
  tpl_ai_name: string | null;
  tpl_ai_confidence: number | null;
  tpl_enriched_at: Date | null;
  tpl_enrichment_source: string | null;
  tpl_enrichment_prompt_version: number | null;
  tpl_created_at: Date;
  tpl_updated_at: Date;
  used_by: string;
  open_problems: string;
}

export async function getTemplateById(
  tplId: number,
): Promise<TemplateDetail | null> {
  if (!sql) return null;
  if (!Number.isFinite(tplId) || tplId <= 0) return null;

  const rows = await sql<RawTemplateDetailRow[]>`
    select
      t.tpl_id,
      t.tpl_name,
      t.tpl_slug,
      t.tpl_vendor_name,
      t.tpl_domain,
      t.tpl_category_hint,
      t.tpl_description,
      t.tpl_icon_url,
      t.tpl_login_url,
      t.tpl_docs_url,
      t.tpl_status_page_url,
      t.tpl_status_feed_url,
      t.tpl_api_base_url,
      t.tpl_auth_type,
      t.tpl_supports_sso,
      t.tpl_supports_scim,
      t.tpl_supports_webhooks,
      t.tpl_supports_api,
      t.tpl_supports_invoice_ingestion,
      t.tpl_mcp_supported,
      t.tpl_intrinsic_scope,
      t.tpl_status,
      t.tpl_ai_name,
      t.tpl_ai_confidence,
      t.tpl_enriched_at,
      t.tpl_enrichment_source,
      t.tpl_enrichment_prompt_version,
      t.tpl_created_at,
      t.tpl_updated_at,
      (
        select count(distinct ti.tol_org_id)
        from tools ti
        where ti.tol_tpl_id = t.tpl_id
          and ti.tol_deleted_at is null
          and ti.tol_status not in (4, 5)
      ) as used_by,
      (
        select count(*)
        from backstage_template_problems p
        where p.btp_tpl_id = t.tpl_id
          and p.btp_status in (1, 2)
      ) as open_problems
    from tool_templates t
    where t.tpl_id = ${tplId}
    limit 1
  `;

  const r = rows[0];
  if (!r) return null;

  return {
    tplId: Number(r.tpl_id),
    name: r.tpl_name,
    slug: r.tpl_slug,
    vendorName: r.tpl_vendor_name,
    domain: r.tpl_domain,
    categoryHint: r.tpl_category_hint,
    description: r.tpl_description,
    iconUrl: r.tpl_icon_url,
    loginUrl: r.tpl_login_url,
    docsUrl: r.tpl_docs_url,
    statusPageUrl: r.tpl_status_page_url,
    statusFeedUrl: r.tpl_status_feed_url,
    apiBaseUrl: r.tpl_api_base_url,
    authType: r.tpl_auth_type,
    supportsSso: r.tpl_supports_sso,
    supportsScim: r.tpl_supports_scim,
    supportsWebhooks: r.tpl_supports_webhooks,
    supportsApi: r.tpl_supports_api,
    supportsInvoiceIngestion: r.tpl_supports_invoice_ingestion,
    mcpSupported: r.tpl_mcp_supported,
    intrinsicScope: r.tpl_intrinsic_scope,
    status: r.tpl_status,
    aiName: r.tpl_ai_name,
    aiConfidence: r.tpl_ai_confidence,
    enrichedAt: r.tpl_enriched_at,
    enrichmentSource: r.tpl_enrichment_source,
    enrichmentPromptVersion: r.tpl_enrichment_prompt_version,
    createdAt: r.tpl_created_at,
    updatedAt: r.tpl_updated_at,
    usedByCount: Number(r.used_by),
    openProblemsCount: Number(r.open_problems),
  };
}

/* ══════════════════════════════════════════════════════════════════════
   Tab queries
   ══════════════════════════════════════════════════════════════════════ */

export async function listApprovedTemplates(
  options: ListTemplatesOptions = {},
): Promise<PagedResult<TemplateRow>> {
  return listByStatus(STATUS_APPROVED, options);
}

export async function listIgnoredTemplates(
  options: ListTemplatesOptions = {},
): Promise<PagedResult<TemplateRow>> {
  return listByStatus(STATUS_IGNORED, options);
}

async function listByStatus(
  status: number,
  options: ListTemplatesOptions,
): Promise<PagedResult<TemplateRow>> {
  const page = Math.max(options.page ?? 1, 1);
  const pageSize = Math.min(
    Math.max(options.pageSize ?? DEFAULT_PAGE_SIZE, 1),
    100,
  );
  const offset = (page - 1) * pageSize;
  const q = options.q?.trim();
  const qPattern = q ? `%${q}%` : null;
  const sort = options.sort ?? "recent";

  if (!sql) return { rows: [], total: 0, page, pageSize };

  const orderBy = (() => {
    switch (sort) {
      case "name_asc":
        return sql`order by t.tpl_name asc`;
      case "first_seen_asc":
        return sql`order by t.tpl_created_at asc`;
      case "used_by_desc":
        return sql`order by used_by desc, t.tpl_name asc`;
      case "recent":
      default:
        return sql`order by t.tpl_updated_at desc`;
    }
  })();

  const rows = await sql<RawTemplateRow[]>`
    select
      t.tpl_id,
      t.tpl_name,
      t.tpl_slug,
      t.tpl_domain,
      t.tpl_vendor_name,
      t.tpl_category_hint,
      t.tpl_supports_sso,
      t.tpl_supports_scim,
      t.tpl_supports_invoice_ingestion,
      t.tpl_created_at,
      t.tpl_updated_at,
      (
        select count(distinct ti.tol_org_id)
        from tools ti
        where ti.tol_tpl_id = t.tpl_id
          and ti.tol_deleted_at is null
          and ti.tol_status not in (4, 5)
      ) as used_by
    from tool_templates t
    where t.tpl_status = ${status}
      ${qPattern ? sql`and (t.tpl_name ilike ${qPattern} or t.tpl_domain ilike ${qPattern} or t.tpl_vendor_name ilike ${qPattern})` : sql``}
    ${orderBy}
    limit ${pageSize}
    offset ${offset}
  `;

  const totalRow = await sql<{ total: string }[]>`
    select count(*)::text as total
    from tool_templates t
    where t.tpl_status = ${status}
      ${qPattern ? sql`and (t.tpl_name ilike ${qPattern} or t.tpl_domain ilike ${qPattern} or t.tpl_vendor_name ilike ${qPattern})` : sql``}
  `;

  return {
    rows: rows.map(mapRow),
    total: Number(totalRow[0]?.total ?? 0),
    page,
    pageSize,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   helpers
   ══════════════════════════════════════════════════════════════════════ */

function mapRow(r: RawTemplateRow): TemplateRow {
  return {
    tplId: Number(r.tpl_id),
    name: r.tpl_name,
    slug: r.tpl_slug,
    domain: r.tpl_domain,
    vendorName: r.tpl_vendor_name,
    category: r.tpl_category_hint,
    usedByCount: Number(r.used_by),
    signals: deriveSignalsFromCapabilities(r),
    createdAt: r.tpl_created_at,
    updatedAt: r.tpl_updated_at,
  };
}

function deriveSignalsFromCapabilities(t: {
  tpl_supports_sso: boolean;
  tpl_supports_scim: boolean;
  tpl_supports_invoice_ingestion: boolean;
}): string[] {
  // Mockup's "Signals" column is shorthand for what Stacktic can do for
  // this tool. Today we infer from capability booleans on the template;
  // once signal_type ↔ template wiring exists we'll read that directly.
  const signals: string[] = [];
  if (t.tpl_supports_invoice_ingestion) signals.push("Cost");
  if (t.tpl_supports_sso || t.tpl_supports_scim) signals.push("Access");
  signals.push("Lifecycle"); // every tool gets ownership signals
  return signals;
}
