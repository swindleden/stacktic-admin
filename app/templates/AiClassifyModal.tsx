"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { classifyDomain } from "./actions";

type Suggested = {
  name: string;
  category: string;
  vendor: string;
  pricing: string;
  signals: string[];
  confidence: number;
};

export function AiClassifyModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [domain, setDomain] = useState("");
  const [suggested, setSuggested] = useState<Suggested | null>(null);
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function run() {
    startTransition(async () => {
      const res = await classifyDomain(domain || "linear.app");
      setNote(res.message);
      setSuggested(res.suggested ?? null);
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI Classify domain"
      subtitle="Pulls metadata, infers category, suggests signals — populates a draft template."
    >
      <div className="space-y-3">
        <label className="block">
          <span className="block text-xs text-muted-light mb-1">Domain</span>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. linear.app"
            className="w-full px-3 py-2 border border-border rounded-md text-sm stk-mono bg-surface text-slate placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent"
          />
        </label>
        <button
          type="button"
          onClick={run}
          disabled={isPending}
          className="px-3 py-1.5 rounded-md text-sm bg-navy text-white hover:bg-ink disabled:opacity-60"
        >
          {isPending ? "Classifying…" : "Run classification"}
        </button>

        {note ? (
          <p className="stk-mono text-[11px] text-muted-light">{note}</p>
        ) : null}

        {suggested ? (
          <div className="mt-3 border border-border rounded-md p-4 bg-surface-subtle text-sm space-y-2">
            <Row label="Name">
              <span className="font-medium text-slate">{suggested.name}</span>
            </Row>
            <Row label="Category">
              <span>{suggested.category}</span>
              <span className="ml-2 stk-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-success-soft text-success-text border border-success-border">
                {suggested.confidence}% confidence
              </span>
            </Row>
            <Row label="Vendor">{suggested.vendor}</Row>
            <Row label="Pricing model">{suggested.pricing}</Row>
            <Row label="Suggested signals">
              <span className="flex flex-wrap gap-1">
                {suggested.signals.map((s) => (
                  <span
                    key={s}
                    className="stk-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-bg-warm text-slate border border-border-soft"
                  >
                    {s}
                  </span>
                ))}
              </span>
            </Row>
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-md text-sm bg-navy text-white hover:bg-ink"
                disabled
                title="Stub — wires to createTemplate() once real classification lands"
              >
                Create draft template
              </button>
              <button
                type="button"
                onClick={() => setSuggested(null)}
                className="px-3 py-1.5 rounded-md text-sm border border-border text-slate hover:bg-bg-warm"
              >
                Discard
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-muted shrink-0">{label}:</span>
      <span className="text-slate">{children}</span>
    </div>
  );
}
