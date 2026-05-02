"use client";

/**
 * EditTemplateForm — client form for the per-template editor.
 *
 * Sections: Identity / About / URLs / Capabilities / AI metadata.
 *
 * Highlight deep-link: the page reads `?highlight=domain,vendor` and
 * passes the parsed list down. Matching inputs render with a colored
 * ring and the first one scrolls into view + focuses on mount. Fields
 * align to the customer Report-a-Problem tag set:
 *
 *   name · logo · domain · vendor · category ·
 *   login_url · docs_url · status_url
 *
 * "Save" diffs the live form state against the initial snapshot and
 * sends only the changed fields to `updateTemplate`. Unchanged fields
 * stay out of the patch — keeps the audit log meaningful and avoids
 * touching values the operator didn't intend to change.
 */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  updateTemplate,
  type TemplatePatch,
  type ActionResult,
} from "./actions";
import type { TemplateDetail } from "@/lib/db/queries/templates";

const CATEGORIES = [
  "Engineering",
  "Design",
  "Marketing",
  "Sales",
  "Finance",
  "HR",
  "Legal",
  "Security",
  "Operations",
  "Customer Support",
  "Productivity",
  "Analytics",
  "Communication",
  "Storage",
  "Identity",
];

const AUTH_TYPES: Array<{ value: number | null; label: string }> = [
  { value: null, label: "—" },
  { value: 1, label: "SSO / OAuth" },
  { value: 2, label: "Manual (username + password)" },
  { value: 3, label: "API key" },
  { value: 4, label: "Unknown" },
];

const INTRINSIC_SCOPES: Array<{ value: number | null; label: string }> = [
  { value: null, label: "—" },
  { value: 1, label: "Personal — designed for a single user" },
  { value: 2, label: "Team — typically a department or group" },
  { value: 3, label: "Company — company-wide infrastructure" },
  { value: 4, label: "Variable — legitimately goes either way" },
];

/** Map customer-facing problem-tag strings → form field keys. */
const HIGHLIGHT_TAG_TO_FIELD: Record<string, FormFieldId> = {
  name: "name",
  logo: "iconUrl",
  domain: "domain",
  vendor: "vendorName",
  category: "categoryHint",
  login_url: "loginUrl",
  docs_url: "docsUrl",
  status_url: "statusPageUrl",
};

type FormFieldId =
  | "name"
  | "vendorName"
  | "domain"
  | "categoryHint"
  | "description"
  | "iconUrl"
  | "loginUrl"
  | "docsUrl"
  | "statusPageUrl"
  | "statusFeedUrl"
  | "apiBaseUrl";

type FormState = {
  name: string;
  vendorName: string;
  domain: string;
  categoryHint: string;
  description: string;
  iconUrl: string;
  loginUrl: string;
  docsUrl: string;
  statusPageUrl: string;
  statusFeedUrl: string;
  apiBaseUrl: string;
  authType: number | null;
  supportsSso: boolean;
  supportsScim: boolean;
  supportsWebhooks: boolean;
  supportsApi: boolean;
  supportsInvoiceIngestion: boolean;
  mcpSupported: boolean;
  intrinsicScope: number | null;
};

export function EditTemplateForm({
  template,
  highlightTags,
}: {
  template: TemplateDetail;
  /** Customer-facing tags from the Report-a-Problem flow. */
  highlightTags: string[];
}) {
  const initial = useMemo<FormState>(() => snapshot(template), [template]);
  const [state, setState] = useState<FormState>(initial);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const highlightFields = useMemo<Set<FormFieldId>>(() => {
    const out = new Set<FormFieldId>();
    for (const tag of highlightTags) {
      const field = HIGHLIGHT_TAG_TO_FIELD[tag];
      if (field) out.add(field);
    }
    return out;
  }, [highlightTags]);

  // Scroll the first highlighted field into view + focus it on mount.
  const firstHighlightedRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (highlightFields.size === 0) return;
    const el = firstHighlightedRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof (el as HTMLInputElement).focus === "function") {
      (el as HTMLInputElement).focus({ preventScroll: true });
    }
  }, [highlightFields]);

  const dirty = useMemo(() => diffPatch(initial, state), [initial, state]);
  const hasChanges = Object.keys(dirty).length > 0;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
    if (result) setResult(null);
  }

  function onSave() {
    if (!hasChanges) return;
    startTransition(async () => {
      const res = await updateTemplate(template.tplId, dirty);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  function onReset() {
    setState(initial);
    setResult(null);
  }

  // Track whether we've already assigned the firstHighlightedRef so a
  // second flagged field doesn't overwrite it.
  let firstAssigned = false;
  function refIfFirstHighlighted(field: FormFieldId) {
    return (el: HTMLElement | null) => {
      if (firstAssigned) return;
      if (!highlightFields.has(field)) return;
      if (el) {
        firstHighlightedRef.current = el;
        firstAssigned = true;
      }
    };
  }

  return (
    <div className="space-y-6">
      <Section title="Identity">
        <Field
          label="Display name"
          required
          highlighted={highlightFields.has("name")}
        >
          <input
            ref={refIfFirstHighlighted("name") as never}
            value={state.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls(highlightFields.has("name"))}
            maxLength={150}
          />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Vendor"
            highlighted={highlightFields.has("vendorName")}
          >
            <input
              ref={refIfFirstHighlighted("vendorName") as never}
              value={state.vendorName}
              onChange={(e) => set("vendorName", e.target.value)}
              placeholder="e.g. Atlassian, Salesforce"
              className={inputCls(highlightFields.has("vendorName"))}
              maxLength={150}
            />
          </Field>
          <Field label="Domain" highlighted={highlightFields.has("domain")}>
            <input
              ref={refIfFirstHighlighted("domain") as never}
              value={state.domain}
              onChange={(e) => set("domain", e.target.value)}
              placeholder="linear.app"
              className={`${inputCls(highlightFields.has("domain"))} stk-mono`}
              maxLength={120}
            />
          </Field>
        </div>
        <Field
          label="Category hint"
          help="Free-form. Matched against per-org categories at import."
          highlighted={highlightFields.has("categoryHint")}
        >
          <input
            ref={refIfFirstHighlighted("categoryHint") as never}
            value={state.categoryHint}
            onChange={(e) => set("categoryHint", e.target.value)}
            list="category-suggestions"
            placeholder="Engineering, Design, …"
            className={inputCls(highlightFields.has("categoryHint"))}
            maxLength={60}
          />
          <datalist id="category-suggestions">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </Section>

      <Section title="About">
        <Field
          label="Description"
          help="One or two sentences shown on customer-facing tool detail."
        >
          <textarea
            value={state.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            className={inputCls(false)}
          />
        </Field>
        <Field
          label="Icon URL"
          help="Simple Icons CDN URL when covered. Falls back to favicon then initials."
          highlighted={highlightFields.has("iconUrl")}
        >
          <div className="flex items-start gap-3">
            <input
              ref={refIfFirstHighlighted("iconUrl") as never}
              value={state.iconUrl}
              onChange={(e) => set("iconUrl", e.target.value)}
              placeholder="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/linear.svg"
              className={`${inputCls(highlightFields.has("iconUrl"))} stk-mono text-xs flex-1`}
              maxLength={500}
            />
            {state.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.iconUrl}
                alt="icon preview"
                className="w-10 h-10 rounded border border-border-soft bg-bg-warm p-1"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                }}
              />
            ) : null}
          </div>
        </Field>
      </Section>

      <Section title="URLs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Login URL"
            highlighted={highlightFields.has("loginUrl")}
          >
            <input
              ref={refIfFirstHighlighted("loginUrl") as never}
              value={state.loginUrl}
              onChange={(e) => set("loginUrl", e.target.value)}
              placeholder="https://app.example.com/login"
              className={`${inputCls(highlightFields.has("loginUrl"))} stk-mono text-xs`}
              maxLength={500}
            />
          </Field>
          <Field
            label="Docs URL"
            highlighted={highlightFields.has("docsUrl")}
          >
            <input
              ref={refIfFirstHighlighted("docsUrl") as never}
              value={state.docsUrl}
              onChange={(e) => set("docsUrl", e.target.value)}
              placeholder="https://docs.example.com"
              className={`${inputCls(highlightFields.has("docsUrl"))} stk-mono text-xs`}
              maxLength={500}
            />
          </Field>
          <Field
            label="Status page URL"
            highlighted={highlightFields.has("statusPageUrl")}
          >
            <input
              ref={refIfFirstHighlighted("statusPageUrl") as never}
              value={state.statusPageUrl}
              onChange={(e) => set("statusPageUrl", e.target.value)}
              placeholder="https://status.example.com"
              className={`${inputCls(highlightFields.has("statusPageUrl"))} stk-mono text-xs`}
              maxLength={500}
            />
          </Field>
          <Field label="Status feed URL" help="RSS / Atom / JSON feed.">
            <input
              value={state.statusFeedUrl}
              onChange={(e) => set("statusFeedUrl", e.target.value)}
              placeholder="https://status.example.com/history.rss"
              className={`${inputCls(false)} stk-mono text-xs`}
              maxLength={500}
            />
          </Field>
          <Field label="API base URL">
            <input
              value={state.apiBaseUrl}
              onChange={(e) => set("apiBaseUrl", e.target.value)}
              placeholder="https://api.example.com"
              className={`${inputCls(false)} stk-mono text-xs`}
              maxLength={500}
            />
          </Field>
        </div>
      </Section>

      <Section title="Capabilities">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Auth type">
            <select
              value={state.authType ?? ""}
              onChange={(e) =>
                set(
                  "authType",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className={inputCls(false)}
            >
              {AUTH_TYPES.map((t) => (
                <option key={String(t.value)} value={t.value ?? ""}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Intrinsic scope">
            <select
              value={state.intrinsicScope ?? ""}
              onChange={(e) =>
                set(
                  "intrinsicScope",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className={inputCls(false)}
            >
              {INTRINSIC_SCOPES.map((s) => (
                <option key={String(s.value)} value={s.value ?? ""}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Toggle
            label="SSO"
            checked={state.supportsSso}
            onChange={(v) => set("supportsSso", v)}
          />
          <Toggle
            label="SCIM"
            checked={state.supportsScim}
            onChange={(v) => set("supportsScim", v)}
          />
          <Toggle
            label="Webhooks"
            checked={state.supportsWebhooks}
            onChange={(v) => set("supportsWebhooks", v)}
          />
          <Toggle
            label="API"
            checked={state.supportsApi}
            onChange={(v) => set("supportsApi", v)}
          />
          <Toggle
            label="Invoice ingestion"
            checked={state.supportsInvoiceIngestion}
            onChange={(v) => set("supportsInvoiceIngestion", v)}
          />
          <Toggle
            label="MCP"
            checked={state.mcpSupported}
            onChange={(v) => set("mcpSupported", v)}
          />
        </div>
      </Section>

      <AiMetadataPanel template={template} />

      {/* ── Save bar ─────────────────────────────────────────── */}
      <div className="sticky bottom-0 -mx-8 px-8 py-3 bg-surface border-t border-border-soft flex items-center justify-between gap-3">
        <div className="text-xs text-muted">
          {hasChanges ? (
            <span className="stk-mono">
              {Object.keys(dirty).length} unsaved change
              {Object.keys(dirty).length === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="text-muted-light">No changes</span>
          )}
          {result ? (
            <span
              className={[
                "ml-3",
                result.ok ? "text-success-text" : "text-warning-text",
              ].join(" ")}
            >
              {result.message}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={isPending || !hasChanges}
            className="px-3 py-1.5 rounded-md text-sm border border-border text-slate hover:bg-bg-warm disabled:opacity-40"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isPending || !hasChanges}
            className="px-3 py-1.5 rounded-md text-sm bg-navy text-white hover:bg-ink disabled:opacity-40"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Read-only AI metadata panel ──────────────────────────────────────────

function AiMetadataPanel({ template }: { template: TemplateDetail }) {
  return (
    <Section
      title="AI metadata"
      subtitle="Read-only. Populated by the enrichment worker."
    >
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Meta label="AI name" value={template.aiName ?? "—"} mono />
        <Meta
          label="Confidence"
          value={
            template.aiConfidence == null ? "—" : `${template.aiConfidence}%`
          }
        />
        <Meta
          label="Enriched"
          value={
            template.enrichedAt
              ? template.enrichedAt.toISOString().slice(0, 10)
              : "Never"
          }
          mono
        />
        <Meta
          label="Prompt v"
          value={template.enrichmentPromptVersion?.toString() ?? "—"}
          mono
        />
      </dl>
    </Section>
  );
}

// ── Layout primitives ────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-surface border border-border rounded-md p-5 shadow-stk-sm">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-heading">{title}</h2>
        {subtitle ? (
          <p className="text-xs text-muted-light mt-0.5">{subtitle}</p>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  help,
  required,
  highlighted,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  highlighted?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">
        {label}
        {required ? <span className="text-critical-text ml-0.5">*</span> : null}
        {highlighted ? (
          <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-warning-soft text-warning-text border border-warning-border">
            Flagged
          </span>
        ) : null}
      </span>
      {children}
      {help ? (
        <span className="block text-[11px] text-muted-light mt-1">{help}</span>
      ) : null}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-border"
      />
      <span className="text-slate">{label}</span>
    </label>
  );
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={[
          "text-slate text-sm",
          mono ? "stk-mono text-xs" : "",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function inputCls(highlighted: boolean): string {
  const base =
    "w-full px-3 py-2 border rounded-md bg-surface text-slate placeholder:text-muted-light focus:outline-none focus:ring-2";
  return highlighted
    ? `${base} border-warning-border ring-2 ring-warning-border/40 focus:ring-warning-border`
    : `${base} border-border focus:ring-brand-accent/30 focus:border-brand-accent`;
}

function snapshot(t: TemplateDetail): FormState {
  return {
    name: t.name,
    vendorName: t.vendorName ?? "",
    domain: t.domain ?? "",
    categoryHint: t.categoryHint ?? "",
    description: t.description ?? "",
    iconUrl: t.iconUrl ?? "",
    loginUrl: t.loginUrl ?? "",
    docsUrl: t.docsUrl ?? "",
    statusPageUrl: t.statusPageUrl ?? "",
    statusFeedUrl: t.statusFeedUrl ?? "",
    apiBaseUrl: t.apiBaseUrl ?? "",
    authType: t.authType,
    supportsSso: t.supportsSso,
    supportsScim: t.supportsScim,
    supportsWebhooks: t.supportsWebhooks,
    supportsApi: t.supportsApi,
    supportsInvoiceIngestion: t.supportsInvoiceIngestion,
    mcpSupported: t.mcpSupported,
    intrinsicScope: t.intrinsicScope,
  };
}

/** Diff `state` against `initial`, returning a TemplatePatch with only
 *  the fields that changed. Same key set in both objects, so this is
 *  cheap. */
function diffPatch(initial: FormState, state: FormState): TemplatePatch {
  const out: TemplatePatch = {};
  if (state.name !== initial.name) out.name = state.name;
  if (state.vendorName !== initial.vendorName) out.vendorName = state.vendorName;
  if (state.domain !== initial.domain) out.domain = state.domain;
  if (state.categoryHint !== initial.categoryHint)
    out.categoryHint = state.categoryHint;
  if (state.description !== initial.description)
    out.description = state.description;
  if (state.iconUrl !== initial.iconUrl) out.iconUrl = state.iconUrl;
  if (state.loginUrl !== initial.loginUrl) out.loginUrl = state.loginUrl;
  if (state.docsUrl !== initial.docsUrl) out.docsUrl = state.docsUrl;
  if (state.statusPageUrl !== initial.statusPageUrl)
    out.statusPageUrl = state.statusPageUrl;
  if (state.statusFeedUrl !== initial.statusFeedUrl)
    out.statusFeedUrl = state.statusFeedUrl;
  if (state.apiBaseUrl !== initial.apiBaseUrl) out.apiBaseUrl = state.apiBaseUrl;
  if (state.authType !== initial.authType) out.authType = state.authType;
  if (state.supportsSso !== initial.supportsSso)
    out.supportsSso = state.supportsSso;
  if (state.supportsScim !== initial.supportsScim)
    out.supportsScim = state.supportsScim;
  if (state.supportsWebhooks !== initial.supportsWebhooks)
    out.supportsWebhooks = state.supportsWebhooks;
  if (state.supportsApi !== initial.supportsApi)
    out.supportsApi = state.supportsApi;
  if (state.supportsInvoiceIngestion !== initial.supportsInvoiceIngestion)
    out.supportsInvoiceIngestion = state.supportsInvoiceIngestion;
  if (state.mcpSupported !== initial.mcpSupported)
    out.mcpSupported = state.mcpSupported;
  if (state.intrinsicScope !== initial.intrinsicScope)
    out.intrinsicScope = state.intrinsicScope;
  return out;
}
