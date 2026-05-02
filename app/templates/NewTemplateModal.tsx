"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { createTemplate } from "./actions";

const CATEGORIES = [
  "Project management",
  "Dev tools",
  "Comms",
  "Sales",
  "Analytics",
  "Security",
  "Knowledge",
  "Observability",
];

export function NewTemplateModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0] ?? "Project management");
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function submit(publish: boolean) {
    startTransition(async () => {
      const res = await createTemplate({ name, domain, category, publish });
      setNote(res.message);
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New tool template"
      subtitle="Define how Stacktic recognizes and reasons about a tool."
      width={640}
      footer={
        <div className="flex justify-between items-center gap-2">
          <button
            type="button"
            className="text-sm text-muted hover:text-slate"
            disabled
            title="Stub — pre-fills from AI Classify once that's wired"
          >
            ⚡ Pre-fill from AI Classify
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-sm border border-border text-slate hover:bg-bg-warm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={isPending || !name}
              className="px-3 py-1.5 rounded-md text-sm border border-border text-slate hover:bg-bg-warm disabled:opacity-60"
            >
              Save as draft
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={isPending || !name}
              className="px-3 py-1.5 rounded-md text-sm bg-success text-white hover:opacity-90 disabled:opacity-60"
            >
              Publish
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Display name" colSpan={2}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Linear"
            className={inputCls}
          />
        </Field>
        <Field label="Primary domain">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="linear.app"
            className={`${inputCls} stk-mono`}
          />
        </Field>
        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {note ? (
        <p className="mt-3 stk-mono text-[11px] text-muted-light">{note}</p>
      ) : null}
    </Modal>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-border rounded-md bg-surface text-slate placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent";

function Field({
  label,
  children,
  colSpan = 1,
}: {
  label: string;
  children: React.ReactNode;
  colSpan?: 1 | 2;
}) {
  return (
    <label className={colSpan === 2 ? "col-span-2" : ""}>
      <span className="block text-xs text-muted-light mb-1">{label}</span>
      {children}
    </label>
  );
}
