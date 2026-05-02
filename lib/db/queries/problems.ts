/**
 * Problem-report queries for the Backstage operator console.
 *
 * Reads from `backstage_template_problems`. Joins to organizations,
 * tool_templates, tools, users for context. Status mapping:
 *   1 Open  ·  2 Acknowledged  ·  3 Resolved  ·  4 Dismissed
 */
import { sql } from "../client";

const DEFAULT_PAGE_SIZE = 25;

export type ProblemStatusFilter = "open" | "active" | "resolved" | "all";

export interface ProblemListRow {
  publicId: string;
  status: number;
  description: string;
  flaggedFields: string[];
  createdAt: Date;
  updatedAt: Date;
  // Org context
  orgPublicId: string;
  orgName: string;
  // Template context
  tplId: number;
  tplName: string;
  tplDomain: string | null;
  // Reporter (nullable — usr could be deleted, or anon)
  reporterEmail: string | null;
}

export interface ListProblemsOptions {
  status?: ProblemStatusFilter;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listProblems(
  options: ListProblemsOptions = {},
): Promise<PagedResult<ProblemListRow>> {
  const page = Math.max(options.page ?? 1, 1);
  const pageSize = Math.min(Math.max(options.pageSize ?? DEFAULT_PAGE_SIZE, 1), 100);
  const offset = (page - 1) * pageSize;
  const status = options.status ?? "active";

  if (!sql) return { rows: [], total: 0, page, pageSize };

  // "active" = Open + Acknowledged (the operator's working queue).
  // "open" = strictly status=1.
  // "resolved" = Resolved + Dismissed (closed states).
  // "all" = no filter.
  const statusFilter = (() => {
    switch (status) {
      case "open":
        return sql`and p.btp_status = 1`;
      case "resolved":
        return sql`and p.btp_status in (3, 4)`;
      case "all":
        return sql``;
      case "active":
      default:
        return sql`and p.btp_status in (1, 2)`;
    }
  })();

  const rows = await sql<RawProblemRow[]>`
    select
      p.btp_public_id,
      p.btp_status,
      p.btp_description,
      p.btp_flagged_fields,
      p.btp_created_at,
      p.btp_updated_at,
      o.org_public_id,
      o.org_name,
      t.tpl_id,
      t.tpl_name,
      t.tpl_domain,
      u.usr_email as reporter_email
    from backstage_template_problems p
    join organizations o on o.org_id = p.btp_org_id
    join tool_templates t on t.tpl_id = p.btp_tpl_id
    left join users u on u.usr_id = p.btp_reporter_usr_id
    where 1 = 1
      ${statusFilter}
    order by p.btp_status asc, p.btp_created_at desc
    limit ${pageSize}
    offset ${offset}
  `;

  const totalRow = await sql<{ total: string }[]>`
    select count(*)::text as total
    from backstage_template_problems p
    where 1 = 1
      ${statusFilter}
  `;

  return {
    rows: rows.map(toListRow),
    total: Number(totalRow[0]?.total ?? 0),
    page,
    pageSize,
  };
}

export interface ProblemDetail extends ProblemListRow {
  // Originating tool — what they were looking at when they reported.
  originatingToolPublicId: string | null;
  originatingToolName: string | null;
  // Resolution metadata
  resolvedAt: Date | null;
  resolutionNote: string | null;
}

export async function getProblemByPublicId(
  publicId: string,
): Promise<ProblemDetail | null> {
  if (!sql) return null;

  const rows = await sql<RawProblemDetailRow[]>`
    select
      p.btp_public_id,
      p.btp_status,
      p.btp_description,
      p.btp_flagged_fields,
      p.btp_created_at,
      p.btp_updated_at,
      p.btp_resolved_at,
      p.btp_resolution_note,
      o.org_public_id,
      o.org_name,
      t.tpl_id,
      t.tpl_name,
      t.tpl_domain,
      u.usr_email as reporter_email,
      ot.tol_public_id as originating_tool_public_id,
      ot.tol_name as originating_tool_name
    from backstage_template_problems p
    join organizations o on o.org_id = p.btp_org_id
    join tool_templates t on t.tpl_id = p.btp_tpl_id
    left join users u on u.usr_id = p.btp_reporter_usr_id
    left join tools ot on ot.tol_id = p.btp_originating_tol_id
    where p.btp_public_id = ${publicId}
    limit 1
  `;

  const row = rows[0];
  if (!row) return null;

  const base = toListRow(row);
  return {
    ...base,
    resolvedAt: row.btp_resolved_at,
    resolutionNote: row.btp_resolution_note,
    originatingToolPublicId: row.originating_tool_public_id,
    originatingToolName: row.originating_tool_name,
  };
}

export async function countOpenProblems(): Promise<number> {
  if (!sql) return 0;
  const rows = await sql<{ total: string }[]>`
    select count(*)::text as total
    from backstage_template_problems
    where btp_status in (1, 2)
  `;
  return Number(rows[0]?.total ?? 0);
}

// ── helpers ──────────────────────────────────────────────────────────────

interface RawProblemRow {
  btp_public_id: string;
  btp_status: number;
  btp_description: string;
  btp_flagged_fields: unknown;
  btp_created_at: Date;
  btp_updated_at: Date;
  org_public_id: string;
  org_name: string;
  tpl_id: number;
  tpl_name: string;
  tpl_domain: string | null;
  reporter_email: string | null;
}

interface RawProblemDetailRow extends RawProblemRow {
  btp_resolved_at: Date | null;
  btp_resolution_note: string | null;
  originating_tool_public_id: string | null;
  originating_tool_name: string | null;
}

function toListRow(r: RawProblemRow): ProblemListRow {
  return {
    publicId: r.btp_public_id,
    status: r.btp_status,
    description: r.btp_description,
    flaggedFields: Array.isArray(r.btp_flagged_fields)
      ? (r.btp_flagged_fields as string[])
      : [],
    createdAt: r.btp_created_at,
    updatedAt: r.btp_updated_at,
    orgPublicId: r.org_public_id,
    orgName: r.org_name,
    tplId: Number(r.tpl_id),
    tplName: r.tpl_name,
    tplDomain: r.tpl_domain,
    reporterEmail: r.reporter_email,
  };
}
