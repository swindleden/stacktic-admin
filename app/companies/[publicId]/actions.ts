"use server";

/**
 * Server-action stubs for the per-company admin actions in the mockup.
 *
 * Real semantics land later — for now each action validates input, logs
 * intent (so we can see them firing in dev) and returns a friendly
 * 'not implemented yet' result that the client renders as a toast/alert.
 *
 * When real semantics arrive: each function still gets to keep its name
 * and signature. Replace the body, leave the call sites alone.
 */

export interface ActionResult {
  ok: boolean;
  message: string;
}

const NOT_IMPLEMENTED: ActionResult = {
  ok: false,
  message:
    "Not implemented yet — server action wired, real semantics land in a follow-up.",
};

export async function impersonateCompany(
  publicId: string,
): Promise<ActionResult> {
  console.info("[admin] impersonate company", { publicId });
  return NOT_IMPLEMENTED;
}

export async function rerunDiscovery(
  publicId: string,
): Promise<ActionResult> {
  console.info("[admin] re-run discovery", { publicId });
  return NOT_IMPLEMENTED;
}

export async function viewAuditLog(publicId: string): Promise<ActionResult> {
  // Currently the per-company audit feed is rendered inline on the profile
  // page's Activity tab — once that exists this action becomes a navigation
  // shortcut. Stubbed for now.
  console.info("[admin] view audit log", { publicId });
  return NOT_IMPLEMENTED;
}

export async function suspendCompany(
  publicId: string,
): Promise<ActionResult> {
  console.warn("[admin] suspend company", { publicId });
  return NOT_IMPLEMENTED;
}
