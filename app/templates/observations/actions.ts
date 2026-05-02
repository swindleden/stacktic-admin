"use server";

/**
 * Server actions for the Observations triage flow.
 *
 *   catalogObservation — operator absorbs an observation into the
 *     catalog. Creates a `tool_templates` row (form inputs for the
 *     ~10 operator-curated fields, AI-enriched values copied from a
 *     representative source tool for capability flags / auth type /
 *     intrinsic scope / enrichment metadata), inserts an alias keyed
 *     on the observation's normalized_name, repoints every matching
 *     inline-metadata `tools` row (org-wide) to the new template,
 *     clears those tools' inline override fields, and marks the
 *     observation `Cataloged` with FK back to the new template.
 *     All in one transaction.
 *
 *   ignoreObservation — operator decides this normalized_name isn't
 *     catalog-worthy. Status flips to Ignored. Customer tools stay
 *     as-is (inline metadata, unchanged behavior).
 *
 * Mandatory absorb: when cataloging, we DO NOT give the operator a
 * "skip the tools" option. The whole point of separating the catalog
 * from observations is that catalog rows are canonical — once an
 * observation is absorbed, every tool whose normalized_name matches
 * derives from the catalog. Per-org inline overrides that customers
 * had set get cleared (they can re-apply via the customer Edit Tool
 * flow if they had a real reason).
 *
 * Audit logging: console.info only. `audit_events.evt_org_id` is
 * NOT NULL and operator-scope catalog actions span multiple orgs;
 * no clean fit for the existing schema. Customer-side audit on the
 * affected tool rows is a Phase 2 enhancement.
 */
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db/client";

export interface ActionResult {
  ok: boolean;
  message: string;
}

const STATUS_APPROVED = 1; // ToolTemplateStatus.Active in the new enum
const OBSERVATION_PENDING = 1;
const OBSERVATION_CATALOGED = 2;
const OBSERVATION_IGNORED = 3;
const ALIAS_SOURCE_CURATED = 1;

export interface CatalogObservationInput {
  /** Observation key — also the alias we insert. */
  normalizedName: string;
  /** Display name for the catalog template (operator-edited). */
  name: string;
  /** Slug — operator can override; we derive a default from the name. */
  slug: string;
  vendorName: string | null;
  domain: string | null;
  categoryHint: string | null;
  description: string | null;
  iconUrl: string | null;
  loginUrl: string | null;
  docsUrl: string | null;
  statusPageUrl: string | null;
}

/**
 * Absorb an observation into the catalog. Runs as a single transaction;
 * partial failures roll back the whole flow.
 */
export async function catalogObservation(
  input: CatalogObservationInput,
): Promise<ActionResult & { tplId?: number }> {
  if (!sql) return { ok: false, message: "Database not configured." };

  const normalizedName = input.normalizedName.trim();
  const name = input.name.trim();
  const slug = input.slug.trim() || slugifyForCatalog(name);

  if (normalizedName.length === 0) {
    return { ok: false, message: "Missing observation key." };
  }
  if (name.length === 0) {
    return { ok: false, message: "Name is required." };
  }
  if (slug.length === 0) {
    return { ok: false, message: "Slug is required." };
  }

  console.info("[backstage] catalog observation", {
    normalizedName,
    name,
    slug,
  });

  let tplId: number | null = null;
  let absorbedToolCount = 0;
  let conflictMessage: string | null = null;

  try {
    await sql.begin(async (tx) => {
      // 1. Pre-flight: confirm the observation exists and is still
      //    Pending. Operator-side staleness is real — two browser tabs,
      //    or someone hit Ignore between the form load and submit.
      const obsRows = await tx<{ count: string }[]>`
        select count(*)::text as count
        from tool_observations
        where tob_normalized_name = ${normalizedName}
          and tob_status = ${OBSERVATION_PENDING}
      `;
      const pendingCount = Number(obsRows[0]?.count ?? 0);
      if (pendingCount === 0) {
        conflictMessage =
          "This observation is no longer pending — refresh and try again.";
        throw new Error("observation-not-pending");
      }

      // 2. Slug uniqueness pre-check. The DB has a UNIQUE on tpl_slug
      //    so we'd see a constraint error anyway, but checking up front
      //    gives a clearer message.
      const slugRows = await tx<{ tpl_id: number }[]>`
        select tpl_id from tool_templates where tpl_slug = ${slug} limit 1
      `;
      if (slugRows.length > 0) {
        conflictMessage =
          "A template already uses that slug. Pick a different one.";
        throw new Error("slug-taken");
      }

      // 3a. Pick a source tool to inherit AI-enriched fields from.
      //     The catalog form only collects ~10 operator-curated fields
      //     (name, vendor, domain, category, urls, description). Every
      //     other AI-fillable column on `tools` (capability flags,
      //     auth_type, intrinsic_scope, ai_name, ai_confidence,
      //     status_feed_url, api_base_url, enrichment metadata) would
      //     otherwise be lost when we clear the tool's inline columns
      //     in step 5.
      //
      //     Strategy: pick the tool with the highest `tol_ai_confidence`
      //     among matching inline-metadata rows. Ties broken by lowest
      //     id (deterministic). When no tool has been AI-enriched yet
      //     (ai_confidence IS NULL on every match), the template gets
      //     schema defaults (false / null) on those columns — same
      //     behavior as before this change.
      const aiSourceRows = await tx<{
        tol_ai_name: string | null;
        tol_auth_type: number | null;
        tol_intrinsic_scope: number | null;
        tol_supports_sso: boolean;
        tol_supports_scim: boolean;
        tol_supports_webhooks: boolean;
        tol_supports_api: boolean;
        tol_supports_invoice_ingestion: boolean;
        tol_mcp_supported: boolean;
        tol_status_feed_url: string | null;
        tol_api_base_url: string | null;
        tol_ai_confidence: number | null;
        tol_enriched_at: Date | null;
        tol_enrichment_source: string | null;
        tol_enrichment_prompt_version: number | null;
      }[]>`
        select
          tol_ai_name, tol_auth_type, tol_intrinsic_scope,
          tol_supports_sso, tol_supports_scim, tol_supports_webhooks,
          tol_supports_api, tol_supports_invoice_ingestion, tol_mcp_supported,
          tol_status_feed_url, tol_api_base_url,
          tol_ai_confidence, tol_enriched_at, tol_enrichment_source,
          tol_enrichment_prompt_version
        from tools
        where tol_tpl_id is null
          and tol_deleted_at is null
          and trim(regexp_replace(lower(tol_name), '[^a-z0-9]+', ' ', 'g')) = ${normalizedName}
          and tol_ai_confidence is not null
        order by tol_ai_confidence desc, tol_id asc
        limit 1
      `;
      const aiSrc = aiSourceRows[0] ?? null;

      // 3b. Create the catalog template. Status = Active (operator
      //     explicitly committed by clicking Add to catalog). Form
      //     inputs win for the 10 operator-curated fields; AI-source
      //     fields above fill the capability/auth/intrinsic-scope/
      //     enrichment-metadata columns the form doesn't surface.
      const inserted = await tx<{ tpl_id: number }[]>`
        insert into tool_templates (
          tpl_name, tpl_slug, tpl_vendor_name, tpl_domain,
          tpl_category_hint, tpl_description, tpl_icon_url,
          tpl_login_url, tpl_docs_url, tpl_status_page_url,
          tpl_ai_name, tpl_auth_type, tpl_intrinsic_scope,
          tpl_supports_sso, tpl_supports_scim, tpl_supports_webhooks,
          tpl_supports_api, tpl_supports_invoice_ingestion, tpl_mcp_supported,
          tpl_status_feed_url, tpl_api_base_url,
          tpl_ai_confidence, tpl_enriched_at, tpl_enrichment_source,
          tpl_enrichment_prompt_version,
          tpl_status, tpl_created_at, tpl_updated_at
        )
        values (
          ${name}, ${slug}, ${input.vendorName}, ${input.domain},
          ${input.categoryHint}, ${input.description}, ${input.iconUrl},
          ${input.loginUrl}, ${input.docsUrl}, ${input.statusPageUrl},
          ${aiSrc?.tol_ai_name ?? null},
          ${aiSrc?.tol_auth_type ?? null},
          ${aiSrc?.tol_intrinsic_scope ?? null},
          ${aiSrc?.tol_supports_sso ?? false},
          ${aiSrc?.tol_supports_scim ?? false},
          ${aiSrc?.tol_supports_webhooks ?? false},
          ${aiSrc?.tol_supports_api ?? false},
          ${aiSrc?.tol_supports_invoice_ingestion ?? false},
          ${aiSrc?.tol_mcp_supported ?? false},
          ${aiSrc?.tol_status_feed_url ?? null},
          ${aiSrc?.tol_api_base_url ?? null},
          ${aiSrc?.tol_ai_confidence ?? null},
          ${aiSrc?.tol_enriched_at ?? null},
          ${aiSrc?.tol_enrichment_source ?? null},
          ${aiSrc?.tol_enrichment_prompt_version ?? null},
          ${STATUS_APPROVED}, now(), now()
        )
        returning tpl_id
      `;
      tplId = Number(inserted[0]?.tpl_id);
      if (!tplId) throw new Error("template-insert-returned-no-row");

      // 4. Insert a Curated alias keyed on the observation's
      //    normalized_name. This is what makes future OAuth scans +
      //    customer searchCatalog match against this template.
      //    ON CONFLICT DO NOTHING — defensive, but in practice we
      //    just verified slug uniqueness and aliases share tpa_alias_normalized.
      await tx`
        insert into tool_template_aliases (
          tpa_tpl_id, tpa_alias, tpa_alias_normalized,
          tpa_source_type, tpa_created_at
        )
        values (
          ${tplId}, ${name}, ${normalizedName},
          ${ALIAS_SOURCE_CURATED}, now()
        )
        on conflict (tpa_alias_normalized) do nothing
      `;

      // 5. Mandatory absorb: repoint every inline-metadata tool whose
      //    normalized name matches, clear their inline override fields
      //    AND their AI/capability columns. The catalog is now the
      //    source of truth — every catalog-relevant column on the tool
      //    row goes back to NULL/false so the tool inherits via the
      //    `tool ?? template` fallback at read time.
      //
      //    Phase 7: AI enrichment runs on inline-metadata tools, so
      //    every column that was AI-fillable also needs clearing here.
      //    Otherwise stale AI values on the tool would shadow the
      //    operator-curated catalog template.
      const repointResult = await tx<{ tol_id: number }[]>`
        update tools
           set tol_tpl_id = ${tplId},
               tol_vendor_name = null,
               tol_domain = null,
               tol_description = null,
               tol_status_page_url = null,
               tol_icon_url = null,
               tol_login_url = null,
               tol_docs_url = null,
               tol_ai_name = null,
               tol_category_hint = null,
               tol_auth_type = null,
               tol_supports_sso = false,
               tol_supports_scim = false,
               tol_supports_webhooks = false,
               tol_supports_api = false,
               tol_supports_invoice_ingestion = false,
               tol_mcp_supported = false,
               tol_intrinsic_scope = null,
               tol_status_feed_url = null,
               tol_api_base_url = null,
               tol_ai_confidence = null,
               tol_enriched_at = null,
               tol_enrichment_source = null,
               tol_enrichment_prompt_version = null,
               tol_updated_at = now()
         where tol_tpl_id is null
           and tol_deleted_at is null
           and trim(regexp_replace(lower(tol_name), '[^a-z0-9]+', ' ', 'g')) = ${normalizedName}
        returning tol_id
      `;
      absorbedToolCount = repointResult.length;

      // 6. Mark observation Cataloged. FK back to the new template
      //    is the audit trail: "this template was created from this
      //    observation by this operator on this date."
      await tx`
        update tool_observations
           set tob_status = ${OBSERVATION_CATALOGED},
               tob_cataloged_tpl_id = ${tplId},
               tob_cataloged_at = now(),
               tob_updated_at = now()
         where tob_normalized_name = ${normalizedName}
           and tob_status = ${OBSERVATION_PENDING}
      `;
    });
  } catch (err) {
    if (conflictMessage) {
      return { ok: false, message: conflictMessage };
    }
    console.error("catalogObservation failed:", err);
    return {
      ok: false,
      message: "Could not catalog the observation. Try again.",
    };
  }

  console.info("[backstage] catalog observation done", {
    normalizedName,
    tplId,
    absorbedToolCount,
  });

  revalidatePath("/templates");
  revalidatePath("/dashboard");
  if (tplId) revalidatePath(`/templates/${tplId}`);

  return {
    ok: true,
    message:
      absorbedToolCount > 0
        ? `Cataloged. Absorbed ${absorbedToolCount} customer tool${
            absorbedToolCount === 1 ? "" : "s"
          }.`
        : "Cataloged.",
    tplId: tplId ?? undefined,
  };
}

/**
 * Mark an observation Ignored. Customer tools that match the
 * normalized_name keep their inline metadata and remain visible to
 * customers — operator just stops seeing the row in the triage queue.
 */
export async function ignoreObservation(
  normalizedName: string,
): Promise<ActionResult> {
  if (!sql) return { ok: false, message: "Database not configured." };
  const trimmed = normalizedName.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: "Missing observation key." };
  }

  console.info("[backstage] ignore observation", { normalizedName: trimmed });

  const rows = await sql<{ tob_id: number }[]>`
    update tool_observations
       set tob_status = ${OBSERVATION_IGNORED},
           tob_updated_at = now()
     where tob_normalized_name = ${trimmed}
       and tob_status = ${OBSERVATION_PENDING}
    returning tob_id
  `;

  if (rows.length === 0) {
    return {
      ok: false,
      message: "No pending observations matched — refresh and try again.",
    };
  }

  revalidatePath("/templates");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: `Ignored ${rows.length} row${rows.length === 1 ? "" : "s"}.`,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   helpers
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Default slug for a new catalog template. Operator can override in
 * the form. Same shape as the seed catalog's slugs (lowercase, hyphens).
 */
function slugifyForCatalog(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 150);
}
