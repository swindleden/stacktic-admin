"use server";

/**
 * Per-problem operator actions. Three transitions on the
 * `backstage_template_problems` row:
 *
 *   acknowledge → status=2 (Acknowledged)
 *   resolve     → status=3 (Resolved)  + resolved_at + optional note
 *   dismiss     → status=4 (Dismissed) + resolved_at + optional note
 *
 * Status lifecycle is forward-only: Open → Acknowledged → Resolved | Dismissed.
 * Server actions enforce this in the WHERE clause so a stale UI can't
 * regress a closed problem back to Open.
 *
 * Operator identity (`btp_resolved_by_usr_id`) is intentionally left NULL.
 * Stacktic Workspace SSO for the operator console isn't wired yet; the
 * column will populate once we have that surface. See the table comment
 * in schema.ts.
 */
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db/client";

export interface ActionResult {
  ok: boolean;
  message: string;
}

const STATUS_OPEN = 1;
const STATUS_ACKNOWLEDGED = 2;
const STATUS_RESOLVED = 3;
const STATUS_DISMISSED = 4;
const NOTE_MAX = 2000;

export async function acknowledgeProblem(
  publicId: string,
): Promise<ActionResult> {
  if (!sql) return { ok: false, message: "Database not configured." };
  if (!publicId) return { ok: false, message: "Missing problem id." };

  console.info("[backstage] acknowledge problem", { publicId });

  // Forward-only: only Open can move to Acknowledged.
  const rows = await sql<{ btp_id: number }[]>`
    update backstage_template_problems
       set btp_status = ${STATUS_ACKNOWLEDGED},
           btp_updated_at = now()
     where btp_public_id = ${publicId}
       and btp_status = ${STATUS_OPEN}
    returning btp_id
  `;

  if (rows.length === 0) {
    return {
      ok: false,
      message: "Problem not found or already past Open.",
    };
  }

  revalidatePath("/problems");
  revalidatePath(`/problems/${publicId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Acknowledged." };
}

export async function resolveProblem(
  publicId: string,
  note?: string,
): Promise<ActionResult> {
  return closeProblem({
    publicId,
    note,
    targetStatus: STATUS_RESOLVED,
    successMessage: "Resolved.",
    failedMessage: "Problem not found or already closed.",
  });
}

export async function dismissProblem(
  publicId: string,
  note?: string,
): Promise<ActionResult> {
  return closeProblem({
    publicId,
    note,
    targetStatus: STATUS_DISMISSED,
    successMessage: "Dismissed.",
    failedMessage: "Problem not found or already closed.",
  });
}

async function closeProblem(args: {
  publicId: string;
  note: string | undefined;
  targetStatus: number;
  successMessage: string;
  failedMessage: string;
}): Promise<ActionResult> {
  if (!sql) return { ok: false, message: "Database not configured." };
  if (!args.publicId) return { ok: false, message: "Missing problem id." };

  const trimmedNote = args.note?.trim() ?? "";
  if (trimmedNote.length > NOTE_MAX) {
    return { ok: false, message: `Note is too long (max ${NOTE_MAX}).` };
  }
  const noteValue = trimmedNote.length === 0 ? null : trimmedNote;

  console.info("[backstage] close problem", {
    publicId: args.publicId,
    targetStatus: args.targetStatus,
    hasNote: noteValue !== null,
  });

  // Forward-only: Open or Acknowledged can move to Resolved/Dismissed.
  // Closed states (3, 4) stay put.
  const rows = await sql<{ btp_id: number }[]>`
    update backstage_template_problems
       set btp_status = ${args.targetStatus},
           btp_resolution_note = ${noteValue},
           btp_resolved_at = now(),
           btp_updated_at = now()
     where btp_public_id = ${args.publicId}
       and btp_status in (${STATUS_OPEN}, ${STATUS_ACKNOWLEDGED})
    returning btp_id
  `;

  if (rows.length === 0) {
    return { ok: false, message: args.failedMessage };
  }

  revalidatePath("/problems");
  revalidatePath(`/problems/${args.publicId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: args.successMessage };
}
