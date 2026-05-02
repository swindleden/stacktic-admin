"use client";

/**
 * CatalogObservationForm — operator-facing form to absorb an observation
 * into the catalog.
 *
 * Defaults pre-fill from per-org tool data (most-common-or-first-non-null).
 * Operator edits the canonical fields, hits "Add to catalog", and the
 * server action atomically:
 *   1. Inserts a new `tool_templates` row
 *   2. Inserts a Curated alias keyed on the observation's normalized_name
 *   3. Repoints every matching inline-metadata `tools` row to the new
 *      template AND clears their inline override fields
 *   4. Marks the observation `Cataloged` with FK back to the template
 *
 * The "Ignore" button next to Save is the same one-click action available
 * on the listing — it lives here too so the operator can decide
 * "actually nope" after reviewing the per-org tool data.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  catalogObservation,
  ignoreObservation,
  type ActionResult,
} from "../actions";

type Defaults = {
  name: string;
  vendorName: string;
  domain: string;
  description: string;
  iconUrl: string;
  loginUrl: string;
  categoryHint: string;
  docsUrl: string;
  statusPageUrl: string;
};

export function CatalogObservationForm({
  normalizedName,
  orgCount,
  defaults,
}: {
  normalizedName: string;
  orgCount: number;
  defaults: Defaults;
}) {
  const router = useRouter();

  const [name, setName] = useState(defaults.name);
  const [slug, setSlug] = useState(slugify(defaults.name));
  const [slugDirty, setSlugDirty] = useState(false);
  const [vendorName, setVendorName] = useState(defaults.vendorName);
  const [domain, setDomain] = useState(defaults.domain);
  const [categoryHint, setCategoryHint] = useState(defaults.categoryHint);
  const [description, setDescription] = useState(defaults.description);
  const [iconUrl, setIconUrl] = useState(defaults.iconUrl);
  const [loginUrl, setLoginUrl] = useState(defaults.loginUrl);
  const [docsUrl, setDocsUrl] = useState(defaults.docsUrl);
  const [statusPageUrl, setStatusPageUrl] = useState(defaults.statusPageUrl);

  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirmIgnore, setConfirmIgnore] = useState(false);

  // Auto-derive slug from name until the operator edits the slug field
  // explicitly. After that, slug is independent.
  function onNameChange(next: string) {
    setName(next);
    if (!slugDirty) setSlug(slugify(next));
  }

  function onCatalog() {
    startTransition(async () => {
      const res = await catalogObservation({
        normalizedName,
        name: name.trim(),
        slug: slug.trim(),
        vendorName: vendorName.trim() || null,
        domain: domain.trim() || null,
        categoryHint: categoryHint.trim() || null,
        description: description.trim() || null,
        iconUrl: iconUrl.trim() || null,
        loginUrl: loginUrl.trim() || null,
        docsUrl: docsUrl.trim() || null,
        statusPageUrl: statusPageUrl.trim() || null,
      });
      setResult(res);
      if (res.ok && res.tplId) {
        // Land on the new catalog template so operator can immediately
        // refine fields, add capability flags, etc.
        router.push(`/templates/${res.tplId}`);
      }
    });
  }

  function onIgnore() {
    if (!confirmIgnore) {
      setConfirmIgnore(true);
      return;
    }
    startTransition(async () => {
      const res = await ignoreObservation(normalizedName);
      setResult(res);
      if (res.ok) {
        router.push("/templates?tab=observations");
      }
    });
  }

  return (
    <section className="bg-surface border border-border rounded-md p-5 shadow-stk-sm">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-heading">
          Add to catalog
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Creates a catalog template, inserts an alias for{" "}
          <code className="stk-mono text-[11px] text-slate bg-bg-warm px-1 rounded">
            {normalizedName}
          </code>
          , and absorbs {formatCount(orgCount, "matching tool")} from your
          customers.
        </p>
      </header>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Display name" required>
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              disabled={isPending}
              maxLength={150}
              className={inputCls}
            />
          </Field>
          <Field
            label="Slug"
            required
            help="URL-safe identifier. Auto-derived from name."
          >
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugDirty(true);
              }}
              disabled={isPending}
              maxLength={150}
              className={`${inputCls} stk-mono text-xs`}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Vendor">
            <input
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              disabled={isPending}
              maxLength={150}
              className={inputCls}
              placeholder="e.g. Atlassian, Salesforce"
            />
          </Field>
          <Field label="Domain">
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={isPending}
              maxLength={120}
              className={`${inputCls} stk-mono text-xs`}
              placeholder="example.com"
            />
          </Field>
        </div>

        <Field label="Category hint" help="Free-form. Maps to per-org categories at import.">
          <input
            value={categoryHint}
            onChange={(e) => setCategoryHint(e.target.value)}
            disabled={isPending}
            maxLength={60}
            className={inputCls}
            placeholder="Engineering, Marketing, …"
          />
        </Field>

        <Field
          label="Description"
          help="One or two sentences shown to customers on the tool detail page."
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
            rows={3}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Login URL">
            <input
              value={loginUrl}
              onChange={(e) => setLoginUrl(e.target.value)}
              disabled={isPending}
              maxLength={500}
              className={`${inputCls} stk-mono text-xs`}
              placeholder="https://app.example.com/login"
            />
          </Field>
          <Field label="Icon URL">
            <input
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              disabled={isPending}
              maxLength={500}
              className={`${inputCls} stk-mono text-xs`}
              placeholder="https://cdn.jsdelivr.net/…"
            />
          </Field>
          <Field label="Docs URL">
            <input
              value={docsUrl}
              onChange={(e) => setDocsUrl(e.target.value)}
              disabled={isPending}
              maxLength={500}
              className={`${inputCls} stk-mono text-xs`}
              placeholder="https://docs.example.com"
            />
          </Field>
          <Field label="Status page URL">
            <input
              value={statusPageUrl}
              onChange={(e) => setStatusPageUrl(e.target.value)}
              disabled={isPending}
              maxLength={500}
              className={`${inputCls} stk-mono text-xs`}
              placeholder="https://status.example.com"
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-border-soft">
        <div className="text-[11.5px] text-muted-light">
          {result && !result.ok ? (
            <span className="text-warning-text">{result.message}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onIgnore}
            disabled={isPending}
            className={[
              "px-3 py-1.5 rounded-md text-sm border transition-colors disabled:opacity-60",
              confirmIgnore
                ? "border-warning-border text-warning-text bg-warning-soft hover:bg-warning-soft/80"
                : "border-border text-muted hover:bg-bg-warm",
            ].join(" ")}
          >
            {confirmIgnore ? "Confirm ignore" : "Ignore…"}
          </button>
          <button
            type="button"
            onClick={onCatalog}
            disabled={isPending || !name.trim() || !slug.trim()}
            // Dark mode flips to teal-1 + brand glow per the
            // decision-log "primary CTA in dark mode" rule. Light mode
            // keeps the dark-on-light ink button. `disabled:opacity-40`
            // applies in both themes — when the form isn't valid the
            // button is correctly muted.
            className={
              "px-3 py-1.5 rounded-md text-sm bg-navy text-white hover:bg-ink " +
              "dark:bg-teal-1 dark:text-paper dark:hover:bg-teal-2 " +
              "dark:shadow-[var(--glow-teal)] " +
              "disabled:opacity-40 disabled:dark:shadow-none"
            }
          >
            {isPending
              ? "Adding…"
              : orgCount > 0
                ? `Add to catalog and absorb ${orgCount} tool${orgCount === 1 ? "" : "s"}`
                : "Add to catalog"}
          </button>
        </div>
      </div>
    </section>
  );
}

// Dark-mode additions:
//   • `dark:bg-paper-3` — input bg drops to `paper-3` (recessed) while
//     the form panel sits on `paper-4`, so inputs read as carved-into
//     the surface rather than blending with it.
//   • `dark:border-line-strong` — at-rest border bumps from 6% white
//     overlay to 10% so input boundaries are clearly visible.
//   • Light mode treatment is unchanged; back-compat aliases
//     (`border-border`, `bg-surface`) keep their existing values.
const inputCls =
  "w-full px-3 py-2 border border-border rounded-md bg-surface text-slate placeholder:text-muted-light " +
  "dark:bg-paper-3 dark:border-line-strong " +
  "focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent " +
  "disabled:cursor-not-allowed disabled:opacity-60";

function Field({
  label,
  help,
  required,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">
        {label}
        {required ? <span className="text-critical-text ml-0.5">*</span> : null}
      </span>
      {children}
      {help ? (
        <span className="block text-[11px] text-muted-light mt-1">{help}</span>
      ) : null}
    </label>
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 150);
}

function formatCount(n: number, singular: string): string {
  return `${n.toLocaleString()} ${singular}${n === 1 ? "" : "s"}`;
}
