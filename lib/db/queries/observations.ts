/**
 * Observation queries for the Backstage operator console.
 *
 * `tool_observations` is the operator's triage queue — every
 * `(org_id, normalized_name)` Stacktic has seen via OAuth scan or
 * customer manual-add (or both — see `tob_seen_via_*` flags).
 *
 * Two main read shapes:
 *
 *   - `listPendingObservations` — grouped by `tob_normalized_name`
 *     across orgs. Powers the Observations tab on the Templates
 *     page. One row per distinct name; aggregates org count, channel
 *     mix, oauth_client_id consistency, first/last seen.
 *
 *   - `getObservationDetail` — drill-in by normalized_name. Returns
 *     the per-org observation rows joined to the tool row each org
 *     created from that name (when present), so the operator can see
 *     vendor / domain / description / icon as the customer entered
 *     it before deciding whether to absorb into the catalog.
 *
 * Schema source of truth: `site-app/lib/db/enums.ts`
 *   - `ToolObservationStatus` Pending=1 | Cataloged=2 | Ignored=3
 *
 * Naming: keys mirror the `tob_*` DB columns so SQL and result types
 * read uniformly. Same convention as `templates.ts`.
 */
import { sql } from "../client";

const DEFAULT_PAGE_SIZE = 25;

const STATUS_PENDING = 1;
const STATUS_CATALOGED = 2;
const STATUS_IGNORED = 3;

/**
 * Postgres expression that mirrors the JS `normalizeAppName` from
 * `site-app/worker/jobs/oauth-scan.helpers.ts` for ASCII names. Used
 * inline in the JOIN below since neither side stores a pre-normalized
 * name column today (Phase 2 polish: add `tol_normalized_name` with
 * an index).
 *
 *     trim(regexp_replace(lower(t.tol_name), '[^a-z0-9]+', ' ', 'g'))
 *
 * Drift caveat: JS does NFKD-normalize before stripping non-alphanumerics,
 * which Postgres' built-in `lower()` doesn't replicate for diacritics.
 * For "Café" vs "Cafe" this query treats them as different names while
 * the JS normalization treats them as the same. Acceptable mismatch
 * for Phase 1 — both inserts (worker + manual-add) pass through JS
 * first, so observation.normalized_name and the JOIN expression align
 * on every row Stacktic actually wrote.
 */

/* ══════════════════════════════════════════════════════════════════════
   Counts
   ══════════════════════════════════════════════════════════════════════ */

export interface ObservationsCounts {
  /** Distinct normalized names with at least one Pending row. */
  pending: number;
  /** Distinct normalized names that have been Cataloged. */
  cataloged: number;
  /** Distinct normalized names that have been Ignored. */
  ignored: number;
}

export async function getObservationsCounts(): Promise<ObservationsCounts> {
  if (!sql) return { pending: 0, cataloged: 0, ignored: 0 };

  const rows = await sql<
    { pending: string; cataloged: string; ignored: string }[]
  >`
    select
      (select count(distinct tob_normalized_name) from tool_observations
        where tob_status = ${STATUS_PENDING})::text as pending,
      (select count(distinct tob_normalized_name) from tool_observations
        where tob_status = ${STATUS_CATALOGED})::text as cataloged,
      (select count(distinct tob_normalized_name) from tool_observations
        where tob_status = ${STATUS_IGNORED})::text as ignored
  `;
  const r = rows[0];
  return {
    pending: Number(r?.pending ?? 0),
    cataloged: Number(r?.cataloged ?? 0),
    ignored: Number(r?.ignored ?? 0),
  };
}

/* ══════════════════════════════════════════════════════════════════════
   Group listing — Observations tab
   ══════════════════════════════════════════════════════════════════════ */

/** One row per distinct `tob_normalized_name` across orgs. */
export interface ObservationGroupRow {
  normalizedName: string;
  /** First raw display text we have on file — operator-readable name. */
  sampleDisplayText: string;
  orgCount: number;
  /** True when at least one org observed this via the customer manual-add flow. */
  anyManual: boolean;
  /** True when at least one org observed this via the OAuth scan worker. */
  anyOauth: boolean;
  /**
   * Distinct OAuth `client_id` values across the orgs that saw this name.
   * 1 when uniform across orgs (strong same-vendor signal); 0 when nobody
   * saw it via OAuth; >1 when multiple vendors share the display name
   * (e.g., two unrelated apps both called "Reports").
   */
  distinctClientIds: number;
  /** First non-null oauth_client_id we have on file. */
  sampleClientId: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export type ObservationChannel = "manual" | "oauth" | "both";

export type ObservationSort =
  | "recent"
  | "org_count_desc"
  | "name_asc"
  | "first_seen_asc";

export interface ListObservationsOptions {
  /** Substring match on normalized_name OR raw display text. */
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: ObservationSort;
  /**
   * Restrict the list to a specific channel pattern. Useful for batch
   * triage — operator can isolate "manual only" rows (likely desktop
   * apps or internal tools) from "OAuth only" rows (classic shadow SaaS)
   * from rows seen via both (strongest catalog candidates).
   */
  channel?: ObservationChannel;
}

export interface PagedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface RawGroupRow {
  tob_normalized_name: string;
  sample_display_text: string;
  org_count: string;
  any_manual: boolean;
  any_oauth: boolean;
  distinct_client_ids: string;
  sample_client_id: string | null;
  first_seen_at: Date;
  last_seen_at: Date;
}

export async function listPendingObservations(
  options: ListObservationsOptions = {},
): Promise<PagedResult<ObservationGroupRow>> {
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
      case "org_count_desc":
        return sql`order by org_count desc, last_seen_at desc`;
      case "name_asc":
        return sql`order by tob_normalized_name asc`;
      case "first_seen_asc":
        return sql`order by first_seen_at asc`;
      case "recent":
      default:
        return sql`order by last_seen_at desc`;
    }
  })();

  // Channel filter operates on aggregate values (BOOL_OR), so it lives
  // in HAVING. Each branch encodes the truth table:
  //   manual → at least one manual + zero OAuth
  //   oauth  → at least one OAuth + zero manual
  //   both   → at least one of each
  const havingChannel = (() => {
    switch (options.channel) {
      case "manual":
        return sql`having bool_or(tob_seen_via_manual) = true and bool_or(tob_seen_via_oauth) = false`;
      case "oauth":
        return sql`having bool_or(tob_seen_via_oauth) = true and bool_or(tob_seen_via_manual) = false`;
      case "both":
        return sql`having bool_or(tob_seen_via_manual) = true and bool_or(tob_seen_via_oauth) = true`;
      default:
        return sql``;
    }
  })();

  const rows = await sql<RawGroupRow[]>`
    select
      tob_normalized_name,
      min(tob_raw_display_text) as sample_display_text,
      count(distinct tob_org_id)::text as org_count,
      bool_or(tob_seen_via_manual) as any_manual,
      bool_or(tob_seen_via_oauth) as any_oauth,
      count(distinct tob_oauth_client_id) filter (where tob_oauth_client_id is not null)::text as distinct_client_ids,
      min(tob_oauth_client_id) as sample_client_id,
      min(tob_first_seen_at) as first_seen_at,
      max(tob_last_seen_at) as last_seen_at
    from tool_observations
    where tob_status = ${STATUS_PENDING}
      ${qPattern ? sql`and (tob_normalized_name ilike ${qPattern} or tob_raw_display_text ilike ${qPattern})` : sql``}
    group by tob_normalized_name
    ${havingChannel}
    ${orderBy}
    limit ${pageSize}
    offset ${offset}
  `;

  const totalRow = await sql<{ total: string }[]>`
    select count(*)::text as total from (
      select tob_normalized_name
      from tool_observations
      where tob_status = ${STATUS_PENDING}
        ${qPattern ? sql`and (tob_normalized_name ilike ${qPattern} or tob_raw_display_text ilike ${qPattern})` : sql``}
      group by tob_normalized_name
      ${havingChannel}
    ) sub
  `;

  return {
    rows: rows.map((r) => ({
      normalizedName: r.tob_normalized_name,
      sampleDisplayText: r.sample_display_text,
      orgCount: Number(r.org_count),
      anyManual: r.any_manual,
      anyOauth: r.any_oauth,
      distinctClientIds: Number(r.distinct_client_ids),
      sampleClientId: r.sample_client_id,
      firstSeenAt: r.first_seen_at,
      lastSeenAt: r.last_seen_at,
    })),
    total: Number(totalRow[0]?.total ?? 0),
    page,
    pageSize,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   Detail view — drill-in by normalized_name
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Per-org observation row + the tool the org actually has for that
 * name. The operator uses the per-row tool data (vendor / domain /
 * description) to fill in the catalog template.
 *
 * `tool*` fields are nullable because a stale observation can outlive
 * its tool (operator deleted, customer archived, etc.) and we want
 * the observation row to surface even when the linked tool is gone.
 */
export interface ObservationDetailRow {
  tobId: number;
  orgId: number;
  orgName: string;
  rawDisplayText: string;
  oauthClientId: string | null;
  seenViaManual: boolean;
  seenViaOauth: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
  toolPublicId: string | null;
  toolName: string | null;
  toolLabel: string | null;
  toolVendorName: string | null;
  toolDomain: string | null;
  toolDescription: string | null;
  toolIconUrl: string | null;
  toolLoginUrl: string | null;
  /** AI-enriched fields. Used by the catalog form's pre-fill — operator
   *  edits before submit, but seeing the AI's guesses in-place beats a
   *  blank form. Null when no enrich_app run has touched this tool. */
  toolCategoryHint: string | null;
  toolDocsUrl: string | null;
  toolStatusPageUrl: string | null;
}

export interface ObservationDetail {
  normalizedName: string;
  /** Aggregate stats — same shape as the group row, recomputed for the detail page. */
  orgCount: number;
  anyManual: boolean;
  anyOauth: boolean;
  distinctClientIds: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  /** Per-org rows, ordered by most-recent-activity. */
  rows: ObservationDetailRow[];
}

interface RawDetailRow {
  tob_id: number;
  tob_org_id: number;
  org_name: string;
  tob_raw_display_text: string;
  tob_oauth_client_id: string | null;
  tob_seen_via_manual: boolean;
  tob_seen_via_oauth: boolean;
  tob_first_seen_at: Date;
  tob_last_seen_at: Date;
  tol_public_id: string | null;
  tol_name: string | null;
  tol_label: string | null;
  tol_vendor_name: string | null;
  tol_domain: string | null;
  tol_description: string | null;
  tol_icon_url: string | null;
  tol_login_url: string | null;
  tol_category_hint: string | null;
  tol_docs_url: string | null;
  tol_status_page_url: string | null;
}

export async function getObservationDetail(
  normalizedName: string,
): Promise<ObservationDetail | null> {
  if (!sql) return null;
  const trimmed = normalizedName.trim();
  if (trimmed.length === 0) return null;

  // Pull the per-org rows joined to each org's tool that matches
  // this observation's normalized_name. The JOIN normalizes the tool
  // name in SQL on the fly; see NORMALIZE_NAME_SQL above for the
  // ASCII-clean drift caveat.
  const rows = await sql<RawDetailRow[]>`
    select
      o.tob_id,
      o.tob_org_id,
      org.org_name,
      o.tob_raw_display_text,
      o.tob_oauth_client_id,
      o.tob_seen_via_manual,
      o.tob_seen_via_oauth,
      o.tob_first_seen_at,
      o.tob_last_seen_at,
      t.tol_public_id,
      t.tol_name,
      t.tol_label,
      t.tol_vendor_name,
      t.tol_domain,
      t.tol_description,
      t.tol_icon_url,
      t.tol_login_url,
      t.tol_category_hint,
      t.tol_docs_url,
      t.tol_status_page_url
    from tool_observations o
    join organizations org on org.org_id = o.tob_org_id
    left join tools t on t.tol_org_id = o.tob_org_id
      and trim(regexp_replace(lower(t.tol_name), '[^a-z0-9]+', ' ', 'g')) = o.tob_normalized_name
      and t.tol_deleted_at is null
      and t.tol_status not in (4, 5)
    where o.tob_normalized_name = ${trimmed}
      and o.tob_status = ${STATUS_PENDING}
    order by o.tob_last_seen_at desc
  `;

  if (rows.length === 0) return null;

  const detailRows: ObservationDetailRow[] = rows.map((r) => ({
    tobId: Number(r.tob_id),
    orgId: Number(r.tob_org_id),
    orgName: r.org_name,
    rawDisplayText: r.tob_raw_display_text,
    oauthClientId: r.tob_oauth_client_id,
    seenViaManual: r.tob_seen_via_manual,
    seenViaOauth: r.tob_seen_via_oauth,
    firstSeenAt: r.tob_first_seen_at,
    lastSeenAt: r.tob_last_seen_at,
    toolPublicId: r.tol_public_id,
    toolName: r.tol_name,
    toolLabel: r.tol_label,
    toolVendorName: r.tol_vendor_name,
    toolDomain: r.tol_domain,
    toolDescription: r.tol_description,
    toolIconUrl: r.tol_icon_url,
    toolLoginUrl: r.tol_login_url,
    toolCategoryHint: r.tol_category_hint,
    toolDocsUrl: r.tol_docs_url,
    toolStatusPageUrl: r.tol_status_page_url,
  }));

  // Recompute aggregates from the loaded rows (cheaper than a second
  // GROUP BY query for the typical small N).
  const orgIds = new Set<number>();
  const clientIds = new Set<string>();
  let anyManual = false;
  let anyOauth = false;
  let firstSeenAt = detailRows[0]!.firstSeenAt;
  let lastSeenAt = detailRows[0]!.lastSeenAt;
  for (const row of detailRows) {
    orgIds.add(row.orgId);
    if (row.oauthClientId) clientIds.add(row.oauthClientId);
    if (row.seenViaManual) anyManual = true;
    if (row.seenViaOauth) anyOauth = true;
    if (row.firstSeenAt < firstSeenAt) firstSeenAt = row.firstSeenAt;
    if (row.lastSeenAt > lastSeenAt) lastSeenAt = row.lastSeenAt;
  }

  return {
    normalizedName: trimmed,
    orgCount: orgIds.size,
    anyManual,
    anyOauth,
    distinctClientIds: clientIds.size,
    firstSeenAt,
    lastSeenAt,
    rows: detailRows,
  };
}
