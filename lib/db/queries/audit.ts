/**
 * Audit-event queries for the operator console.
 *
 * Joins audit_events to organizations for the org name + back to users so we
 * can render an actor email. No org filter — site-admin sees everything.
 */
import { sql } from "../client";

export interface AuditEventRow {
  id: number;
  orgPublicId: string;
  orgName: string;
  actorType: number;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  payloadJson: unknown;
  createdAt: Date;
}

export async function listAuditEvents(
  options: { limit?: number; orgPublicId?: string } = {},
): Promise<AuditEventRow[]> {
  if (!sql) return [];

  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const orgFilter = options.orgPublicId ?? null;

  // Two paths because postgres-js's tagged-template doesn't conditionally
  // splice clauses cleanly — easier to branch at the call site than to
  // build a fragment. The orgPublicId join condition is cheap regardless.
  const rows = orgFilter
    ? await sql<RawAuditRow[]>`
        select
          e.evt_id,
          o.org_public_id,
          o.org_name,
          e.evt_actor_type,
          u.usr_email as actor_email,
          e.evt_action,
          e.evt_entity_type,
          e.evt_entity_id,
          e.evt_payload_json,
          e.evt_created_at
        from audit_events e
        join organizations o on o.org_id = e.evt_org_id
        left join users u on u.usr_id = e.evt_actor_usr_id
        where o.org_public_id = ${orgFilter}
        order by e.evt_created_at desc
        limit ${limit}
      `
    : await sql<RawAuditRow[]>`
        select
          e.evt_id,
          o.org_public_id,
          o.org_name,
          e.evt_actor_type,
          u.usr_email as actor_email,
          e.evt_action,
          e.evt_entity_type,
          e.evt_entity_id,
          e.evt_payload_json,
          e.evt_created_at
        from audit_events e
        join organizations o on o.org_id = e.evt_org_id
        left join users u on u.usr_id = e.evt_actor_usr_id
        order by e.evt_created_at desc
        limit ${limit}
      `;

  return rows.map((r) => ({
    id: Number(r.evt_id),
    orgPublicId: r.org_public_id,
    orgName: r.org_name,
    actorType: r.evt_actor_type,
    actorEmail: r.actor_email,
    action: r.evt_action,
    entityType: r.evt_entity_type,
    entityId: r.evt_entity_id == null ? null : Number(r.evt_entity_id),
    payloadJson: r.evt_payload_json,
    createdAt: r.evt_created_at,
  }));
}

interface RawAuditRow {
  evt_id: string | number;
  org_public_id: string;
  org_name: string;
  evt_actor_type: number;
  actor_email: string | null;
  evt_action: string;
  evt_entity_type: string | null;
  evt_entity_id: string | number | null;
  evt_payload_json: unknown;
  evt_created_at: Date;
}
