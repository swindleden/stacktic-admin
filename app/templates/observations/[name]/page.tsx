import Link from "next/link";
import { notFound } from "next/navigation";
import { dbConfigured } from "@/lib/db/client";
import { getObservationDetail } from "@/lib/db/queries/observations";
import { formatInt, relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  TableCard,
  Td,
  Th,
  tableBodyRowClass,
  tableHeadClass,
} from "@/components/ui/TableCard";
import { CatalogObservationForm } from "./CatalogObservationForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ name: string }>;
}

export default async function ObservationDetailPage({ params }: Props) {
  const { name } = await params;
  const normalizedName = decodeURIComponent(name).trim();

  if (normalizedName.length === 0) notFound();

  if (!dbConfigured) {
    return (
      <Frame>
        <EmptyState
          title="Database not configured"
          body="Configure DATABASE_URL to load observations."
        />
      </Frame>
    );
  }

  const detail = await getObservationDetail(normalizedName);
  if (!detail) {
    // Either never existed, or the observation has moved past Pending
    // (cataloged or ignored). Either way the operator's drill-in
    // landing page no longer applies — bounce to the listing.
    return (
      <Frame>
        <EmptyState
          title="Observation not pending"
          body={
            <>
              This name isn&apos;t in the triage queue right now — it may
              have been cataloged or ignored.{" "}
              <Link
                href="/templates?tab=observations"
                className="text-link hover:underline"
              >
                Back to observations
              </Link>
            </>
          }
        />
      </Frame>
    );
  }

  // Pre-fill catalog form from the most-common-or-first-non-null inline
  // values across orgs. Operator edits before submit.
  const formDefaults = deriveFormDefaults(detail.rows);
  const sampleDisplayText =
    detail.rows[0]?.toolName ?? detail.rows[0]?.rawDisplayText ?? normalizedName;

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 bg-surface border-b border-border-soft px-8 py-5">
        <div className="text-xs text-muted mb-1">
          <Link
            href="/templates?tab=observations"
            className="hover:text-slate hover:underline"
          >
            Observations
          </Link>{" "}
          / <span className="stk-mono text-slate">{normalizedName}</span>
        </div>
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-heading flex items-center gap-3 flex-wrap">
              {sampleDisplayText}
              {detail.anyManual ? (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-warning-soft text-warning-text border border-warning-border">
                  Manual
                </span>
              ) : null}
              {detail.anyOauth ? (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-info-soft text-info-text border border-info-border">
                  OAuth
                </span>
              ) : null}
            </h1>
            <p className="text-sm text-muted mt-1 flex items-center gap-3 flex-wrap">
              <span>
                {formatInt(detail.orgCount)} org
                {detail.orgCount === 1 ? "" : "s"}
              </span>
              {detail.distinctClientIds > 0 ? (
                <span className="text-xs text-muted-light">
                  · {detail.distinctClientIds} distinct OAuth client
                  {detail.distinctClientIds === 1 ? "" : "s"}
                </span>
              ) : null}
              <span>
                · Last seen{" "}
                <span title={detail.lastSeenAt.toISOString()}>
                  {relativeTime(detail.lastSeenAt)}
                </span>
              </span>
            </p>
          </div>
        </div>
      </header>

      <div className="px-8 py-6 space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-heading mb-2">
            Per-org tools
          </h2>
          <p className="text-xs text-muted mb-3">
            What each customer has stored. Use this as reference when
            filling in the catalog form below — pick the canonical
            values that should win for everyone.
          </p>
          <TableCard>
            <table className="w-full text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <Th>Org</Th>
                  <Th>Tool name</Th>
                  <Th>Vendor</Th>
                  <Th>Domain</Th>
                  <Th>Login URL</Th>
                  <Th>Last seen</Th>
                </tr>
              </thead>
              <tbody>
                {detail.rows.map((row) => (
                  <tr key={row.tobId} className={tableBodyRowClass}>
                    <Td>
                      <span className="text-slate">{row.orgName}</span>
                      <div className="flex gap-1 mt-0.5">
                        {row.seenViaManual ? (
                          <span className="inline-block px-1 py-0.5 rounded text-[9.5px] uppercase tracking-wide bg-warning-soft text-warning-text border border-warning-border">
                            M
                          </span>
                        ) : null}
                        {row.seenViaOauth ? (
                          <span className="inline-block px-1 py-0.5 rounded text-[9.5px] uppercase tracking-wide bg-info-soft text-info-text border border-info-border">
                            O
                          </span>
                        ) : null}
                      </div>
                    </Td>
                    <Td>
                      {row.toolName ? (
                        <span className="font-medium text-heading">
                          {row.toolName}
                        </span>
                      ) : (
                        <span className="stk-mono text-xs text-muted-light">
                          {row.rawDisplayText}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {row.toolVendorName ? (
                        <span className="text-xs text-slate">
                          {row.toolVendorName}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-light">—</span>
                      )}
                    </Td>
                    <Td>
                      {row.toolDomain ? (
                        <span className="stk-mono text-xs text-muted">
                          {row.toolDomain}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-light">—</span>
                      )}
                    </Td>
                    <Td>
                      {row.toolLoginUrl ? (
                        <span
                          className="stk-mono text-[10.5px] text-muted truncate inline-block max-w-[200px]"
                          title={row.toolLoginUrl}
                        >
                          {row.toolLoginUrl}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-light">—</span>
                      )}
                    </Td>
                    <Td>
                      <span
                        className="text-muted text-xs"
                        title={row.lastSeenAt.toISOString()}
                      >
                        {relativeTime(row.lastSeenAt)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </section>

        <CatalogObservationForm
          normalizedName={normalizedName}
          orgCount={detail.orgCount}
          defaults={{
            ...formDefaults,
            name: sampleDisplayText,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Pick the most-common-or-first-non-null value per field across orgs.
 * Operator will edit before submitting; this is just a sensible default
 * so they're not staring at an empty form.
 *
 * Fields included here MUST mirror the form's controlled inputs in
 * `CatalogObservationForm.tsx` — anything missing here lands in the
 * form as an empty string and silently drops the AI-enriched value
 * even when one exists on the per-org tool rows.
 */
function deriveFormDefaults(
  rows: Array<{
    toolVendorName: string | null;
    toolDomain: string | null;
    toolDescription: string | null;
    toolIconUrl: string | null;
    toolLoginUrl: string | null;
    toolCategoryHint: string | null;
    toolDocsUrl: string | null;
    toolStatusPageUrl: string | null;
  }>,
): {
  vendorName: string;
  domain: string;
  description: string;
  iconUrl: string;
  loginUrl: string;
  categoryHint: string;
  docsUrl: string;
  statusPageUrl: string;
} {
  return {
    vendorName: pickMostCommon(rows.map((r) => r.toolVendorName)) ?? "",
    domain: pickMostCommon(rows.map((r) => r.toolDomain)) ?? "",
    description: pickMostCommon(rows.map((r) => r.toolDescription)) ?? "",
    iconUrl: pickMostCommon(rows.map((r) => r.toolIconUrl)) ?? "",
    loginUrl: pickMostCommon(rows.map((r) => r.toolLoginUrl)) ?? "",
    categoryHint: pickMostCommon(rows.map((r) => r.toolCategoryHint)) ?? "",
    docsUrl: pickMostCommon(rows.map((r) => r.toolDocsUrl)) ?? "",
    statusPageUrl: pickMostCommon(rows.map((r) => r.toolStatusPageUrl)) ?? "",
  };
}

/**
 * Return the most-frequent non-null value, or the first non-null value
 * if there's a tie. Returns null when every entry is null.
 */
function pickMostCommon(values: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  let firstSeen: string | null = null;
  for (const v of values) {
    if (v == null) continue;
    if (firstSeen === null) firstSeen = v;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let best = firstSeen!;
  let bestCount = counts.get(best) ?? 0;
  for (const [val, count] of counts) {
    if (count > bestCount) {
      best = val;
      bestCount = count;
    }
  }
  return best;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 bg-surface border-b border-border-soft px-8 py-5">
        <h1 className="text-xl font-semibold text-heading">Observation</h1>
      </header>
      <div className="px-8 py-6">{children}</div>
    </div>
  );
}
