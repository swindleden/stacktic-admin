"use server";

/**
 * Template-edit server action.
 *
 * Single endpoint, `updateTemplate(tplId, fields)`. Each field on
 * `fields` is optional; we patch only what the operator changed. Empty
 * strings are coerced to NULL on nullable text columns — operators
 * clear a field by submitting "" rather than calling out to a dedicated
 * "clear" action.
 *
 * What's NOT editable here (use other surfaces / leave alone):
 *   - tpl_status      → use Approve / Ignore on the list page
 *   - tpl_source      → immutable, set once at insert
 *   - tpl_org_id      → use Approve to promote a private to global
 *   - tpl_slug        → renaming slugs is dangerous (FK references)
 *   - tpl_ai_*        → set by the enrichment worker only
 *   - tpl_*_at        → audit timestamps
 *
 * Audit logging: console.info only for now. `audit_events.evt_org_id`
 * is NOT NULL and operator-scope edits to global templates have no
 * sensible orgId. Same call-out as the other Backstage actions.
 */
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db/client";

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface TemplatePatch {
  // Identity
  name?: string;
  vendorName?: string;
  domain?: string;
  categoryHint?: string;
  // About
  description?: string;
  iconUrl?: string;
  // URLs
  loginUrl?: string;
  docsUrl?: string;
  statusPageUrl?: string;
  statusFeedUrl?: string;
  apiBaseUrl?: string;
  // Capabilities
  authType?: number | null;
  supportsSso?: boolean;
  supportsScim?: boolean;
  supportsWebhooks?: boolean;
  supportsApi?: boolean;
  supportsInvoiceIngestion?: boolean;
  mcpSupported?: boolean;
  intrinsicScope?: number | null;
}

const VALID_AUTH_TYPES = new Set([1, 2, 3, 4]);
const VALID_INTRINSIC_SCOPES = new Set([1, 2, 3, 4]);

export async function updateTemplate(
  tplId: number,
  patch: TemplatePatch,
): Promise<ActionResult> {
  if (!sql) return { ok: false, message: "Database not configured." };
  if (!Number.isFinite(tplId) || tplId <= 0) {
    return { ok: false, message: "Invalid template id." };
  }

  // ── Normalize + validate ───────────────────────────────────────
  const normalized: Record<string, unknown> = {};

  if (patch.name !== undefined) {
    const v = patch.name.trim();
    if (v.length === 0) {
      return { ok: false, message: "Name is required." };
    }
    if (v.length > 150) {
      return { ok: false, message: "Name is too long (max 150)." };
    }
    normalized.tpl_name = v;
  }
  if (patch.vendorName !== undefined) {
    normalized.tpl_vendor_name = nullableTrim(patch.vendorName, 150);
  }
  if (patch.domain !== undefined) {
    const d = patch.domain.trim().toLowerCase();
    normalized.tpl_domain = d.length === 0 ? null : d.slice(0, 120);
  }
  if (patch.categoryHint !== undefined) {
    normalized.tpl_category_hint = nullableTrim(patch.categoryHint, 60);
  }
  if (patch.description !== undefined) {
    const v = patch.description.trim();
    normalized.tpl_description = v.length === 0 ? null : v;
  }
  if (patch.iconUrl !== undefined) {
    const v = patch.iconUrl.trim();
    if (v.length > 0 && !isValidHttpUrl(v)) {
      return { ok: false, message: "Icon URL must be a valid http(s) URL." };
    }
    normalized.tpl_icon_url = v.length === 0 ? null : v.slice(0, 500);
  }
  if (patch.loginUrl !== undefined) {
    const v = patch.loginUrl.trim();
    if (v.length > 0 && !isValidHttpUrl(v)) {
      return { ok: false, message: "Login URL must be a valid http(s) URL." };
    }
    normalized.tpl_login_url = v.length === 0 ? null : v.slice(0, 500);
  }
  if (patch.docsUrl !== undefined) {
    const v = patch.docsUrl.trim();
    if (v.length > 0 && !isValidHttpUrl(v)) {
      return { ok: false, message: "Docs URL must be a valid http(s) URL." };
    }
    normalized.tpl_docs_url = v.length === 0 ? null : v.slice(0, 500);
  }
  if (patch.statusPageUrl !== undefined) {
    const v = patch.statusPageUrl.trim();
    if (v.length > 0 && !isValidHttpUrl(v)) {
      return {
        ok: false,
        message: "Status page URL must be a valid http(s) URL.",
      };
    }
    normalized.tpl_status_page_url = v.length === 0 ? null : v.slice(0, 500);
  }
  if (patch.statusFeedUrl !== undefined) {
    const v = patch.statusFeedUrl.trim();
    if (v.length > 0 && !isValidHttpUrl(v)) {
      return {
        ok: false,
        message: "Status feed URL must be a valid http(s) URL.",
      };
    }
    normalized.tpl_status_feed_url = v.length === 0 ? null : v.slice(0, 500);
  }
  if (patch.apiBaseUrl !== undefined) {
    const v = patch.apiBaseUrl.trim();
    if (v.length > 0 && !isValidHttpUrl(v)) {
      return {
        ok: false,
        message: "API base URL must be a valid http(s) URL.",
      };
    }
    normalized.tpl_api_base_url = v.length === 0 ? null : v.slice(0, 500);
  }
  if (patch.authType !== undefined) {
    if (patch.authType === null) {
      normalized.tpl_auth_type = null;
    } else if (VALID_AUTH_TYPES.has(patch.authType)) {
      normalized.tpl_auth_type = patch.authType;
    } else {
      return { ok: false, message: "Invalid auth type." };
    }
  }
  if (patch.intrinsicScope !== undefined) {
    if (patch.intrinsicScope === null) {
      normalized.tpl_intrinsic_scope = null;
    } else if (VALID_INTRINSIC_SCOPES.has(patch.intrinsicScope)) {
      normalized.tpl_intrinsic_scope = patch.intrinsicScope;
    } else {
      return { ok: false, message: "Invalid intrinsic scope." };
    }
  }
  if (patch.supportsSso !== undefined) {
    normalized.tpl_supports_sso = !!patch.supportsSso;
  }
  if (patch.supportsScim !== undefined) {
    normalized.tpl_supports_scim = !!patch.supportsScim;
  }
  if (patch.supportsWebhooks !== undefined) {
    normalized.tpl_supports_webhooks = !!patch.supportsWebhooks;
  }
  if (patch.supportsApi !== undefined) {
    normalized.tpl_supports_api = !!patch.supportsApi;
  }
  if (patch.supportsInvoiceIngestion !== undefined) {
    normalized.tpl_supports_invoice_ingestion =
      !!patch.supportsInvoiceIngestion;
  }
  if (patch.mcpSupported !== undefined) {
    normalized.tpl_mcp_supported = !!patch.mcpSupported;
  }

  if (Object.keys(normalized).length === 0) {
    return { ok: true, message: "No changes." };
  }

  // ── Apply ─────────────────────────────────────────────────────
  console.info("[admin] update template", {
    tplId,
    fields: Object.keys(normalized),
  });

  // postgres-js's tagged-template doesn't have a generic "update an
  // arbitrary set of columns" helper, so we build the SET clause as a
  // sequence of fragments and join with commas. `sql(value)` is the
  // value-binding form. Field names are whitelisted above so there's
  // no SQL-injection surface here.
  //
  // Capture sql in a local non-null binding so TS keeps the narrowing
  // across the closure boundary.
  const sqlNN = sql;
  const setFragments = Object.entries(normalized).map(
    ([col, val]) => sqlNN`${sqlNN(col)} = ${val as never}`,
  );
  const setClause = setFragments.reduce(
    (acc, frag, idx) => (idx === 0 ? frag : sqlNN`${acc}, ${frag}`),
  );

  const rows = await sql<{ tpl_id: number }[]>`
    update tool_templates
       set ${setClause},
           tpl_updated_at = now()
     where tpl_id = ${tplId}
    returning tpl_id
  `;

  if (rows.length === 0) {
    return { ok: false, message: "Template not found." };
  }

  revalidatePath("/templates");
  revalidatePath(`/templates/${tplId}`);
  revalidatePath("/dashboard");

  return { ok: true, message: "Template saved." };
}

// ── helpers ──────────────────────────────────────────────────────────────

function nullableTrim(s: string, max: number): string | null {
  const v = s.trim();
  if (v.length === 0) return null;
  return v.slice(0, max);
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
