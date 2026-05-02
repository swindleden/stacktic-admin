"use server";

/**
 * Server actions for the Templates surface.
 *
 * Three real actions:
 *
 *   approveTemplate  — flip status to Active. If the template is
 *                      private (`tpl_org_id IS NOT NULL`) we ALSO
 *                      null out `tpl_org_id` so the row joins the
 *                      global catalog. `tpl_source` stays untouched
 *                      so origin history (Manual / OAuth / Seed) is
 *                      preserved across the lifecycle change.
 *
 *   ignoreTemplate   — flip status to Ignored. Don't touch
 *                      `tpl_org_id`. With `tpl_org_id IS NULL` this
 *                      means "well-known app, won't curate"; with
 *                      `tpl_org_id IS NOT NULL` it means "bespoke
 *                      internal app for that org" (the page renders
 *                      a "Custom" sub-badge on those rows).
 *
 *   mergeTemplate    — fold one template's tools into another and
 *                      retire the source. Stub for now — proper
 *                      merge requires a `merged_into_tpl_id`
 *                      column or equivalent so historical references
 *                      stay resolvable. Ships in a follow-up.
 *
 * Audit logging: Phase 1 logs to console only. `audit_events` is
 * per-org (NOT NULL), and operator-scope actions on global rows
 * don't have a sensible orgId. Once we add an operator-audit
 * surface (or relax the NOT NULL), wire writes here.
 */
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db/client";

export interface ActionResult {
  ok: boolean;
  message: string;
}

const STATUS_APPROVED = 2;
const STATUS_IGNORED = 3;

// ── Existing classify-domain stub kept as-is ─────────────────────────────

export async function classifyDomain(domain: string): Promise<
  ActionResult & {
    suggested?: {
      name: string;
      category: string;
      vendor: string;
      pricing: string;
      signals: string[];
      confidence: number;
    };
  }
> {
  console.info("[admin] classify domain", { domain });
  const stem = (domain || "linear.app").split(".")[0] ?? "linear";
  return {
    ok: true,
    message: "Stubbed classification — replace with real call before shipping.",
    suggested: {
      name: stem.charAt(0).toUpperCase() + stem.slice(1),
      category: "Project management",
      vendor: `${stem.charAt(0).toUpperCase()}${stem.slice(1)} Inc.`,
      pricing: "Per-seat — TBD",
      signals: ["Cost", "Access", "Lifecycle"],
      confidence: 88,
    },
  };
}

export async function createTemplate(payload: {
  name: string;
  domain: string;
  category: string;
  publish: boolean;
}): Promise<ActionResult> {
  console.info("[admin] create template", payload);
  return {
    ok: false,
    message:
      "Not implemented yet — server action wired, real semantics land in a follow-up.",
  };
}

// ── Approve / Ignore / Merge ─────────────────────────────────────────────

/**
 * Approve a template. Context-aware:
 *   - Global (tpl_org_id IS NULL): just flip status to Active.
 *   - Private (tpl_org_id IS NOT NULL): flip status AND null out
 *     tpl_org_id (promote to global). Source stays as-is.
 *
 * Slug uniqueness: tpl_slug is globally UNIQUE. ManualEntry slugs
 * have a `{base}-{orgId}-{rand}` shape so they don't collide with
 * curated globals — promotion keeps the suffixed slug. Cleanup
 * (renaming the slug to its bare form during promotion) is a
 * Phase 2 polish.
 */
export async function approveTemplate(tplId: number): Promise<ActionResult> {
  if (!sql) {
    return { ok: false, message: "Database not configured." };
  }
  if (!Number.isFinite(tplId) || tplId <= 0) {
    return { ok: false, message: "Invalid template id." };
  }

  console.info("[admin] approve template", { tplId });

  const rows = await sql<{ tpl_id: number; tpl_org_id: number | null }[]>`
    update tool_templates
       set tpl_status = ${STATUS_APPROVED},
           tpl_org_id = null,
           tpl_updated_at = now()
     where tpl_id = ${tplId}
    returning tpl_id, tpl_org_id
  `;

  if (rows.length === 0) {
    return { ok: false, message: "Template not found." };
  }

  revalidatePath("/templates");
  revalidatePath("/dashboard");
  return { ok: true, message: "Template approved." };
}

/**
 * Mark a template as Ignored. Status flips to 3; tpl_org_id stays
 * as-is so the page can distinguish a "well-known app, won't
 * curate" (global) from a "bespoke internal app" (private, badged
 * Custom).
 *
 * Ignored templates STILL match during OAuth scan + searchCatalog
 * within the visibility scope. Status is the operator's review-
 * queue tool, not a customer-facing gate.
 */
export async function ignoreTemplate(tplId: number): Promise<ActionResult> {
  if (!sql) {
    return { ok: false, message: "Database not configured." };
  }
  if (!Number.isFinite(tplId) || tplId <= 0) {
    return { ok: false, message: "Invalid template id." };
  }

  console.info("[admin] ignore template", { tplId });

  const rows = await sql<{ tpl_id: number }[]>`
    update tool_templates
       set tpl_status = ${STATUS_IGNORED},
           tpl_updated_at = now()
     where tpl_id = ${tplId}
    returning tpl_id
  `;

  if (rows.length === 0) {
    return { ok: false, message: "Template not found." };
  }

  revalidatePath("/templates");
  revalidatePath("/dashboard");
  return { ok: true, message: "Template ignored." };
}

/**
 * Stub. Real merge requires either:
 *  (a) a `tpl_merged_into_tpl_id` column so historical references
 *      to the merged-away row still resolve, OR
 *  (b) a soft-delete column on tool_templates.
 *
 * Both are schema work. Wired here so the UI can call it and we can
 * iterate on the visual flow without blocking on the schema decision.
 */
export async function mergeTemplate(
  tplId: number,
  intoTplId: number,
): Promise<ActionResult> {
  console.info("[admin] merge template", { tplId, intoTplId });
  return {
    ok: false,
    message:
      "Merge isn't wired yet — needs a merged_into_tpl_id column. Coming soon.",
  };
}

/* ── Legacy aliases ──────────────────────────────────────────────────────
 *
 * The old action names (`promoteUnofficial` / `mergeUnofficial` /
 * `dismissUnofficial`) referenced the previous Official/Unofficial tab
 * model. The new lifecycle uses Approve / Ignore / Merge. Aliases here
 * keep older callers compiling while we migrate the client.
 *
 * TODO: delete after the next Backstage UI pass confirms no callers.
 */

/** @deprecated Use `approveTemplate(tplId)`. */
export const promoteUnofficial = approveTemplate;
/** @deprecated Use `ignoreTemplate(tplId)`. */
export const dismissUnofficial = ignoreTemplate;
/** @deprecated Use `mergeTemplate(tplId, intoTplId)`. */
export const mergeUnofficial = mergeTemplate;
