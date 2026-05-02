"use client";

import { useState, useTransition } from "react";
import {
  type ActionResult,
  impersonateCompany,
  rerunDiscovery,
  suspendCompany,
  viewAuditLog,
} from "./actions";

type ActionId = "impersonate" | "rerun" | "audit" | "suspend";

const ACTIONS: Array<{
  id: ActionId;
  label: string;
  destructive?: boolean;
  confirm?: string;
}> = [
  { id: "impersonate", label: "Impersonate (read-only)" },
  { id: "rerun", label: "Re-run discovery" },
  { id: "audit", label: "View audit log" },
  {
    id: "suspend",
    label: "Suspend account",
    destructive: true,
    confirm:
      "Suspend this company? They'll lose access until you re-activate them. This is reversible.",
  },
];

export function AdminActionsCard({ publicId }: { publicId: string }) {
  const [isPending, startTransition] = useTransition();
  const [lastAction, setLastAction] = useState<ActionId | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);

  function run(id: ActionId, confirm?: string) {
    if (confirm && !window.confirm(confirm)) return;

    startTransition(async () => {
      setLastAction(id);
      const fn = ACTION_FNS[id];
      const res = await fn(publicId);
      setResult(res);
    });
  }

  return (
    <div className="bg-surface border border-border rounded-md p-5 shadow-stk-sm">
      <h3 className="text-sm font-semibold text-heading mb-3">Admin actions</h3>
      <div className="space-y-2 text-sm">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={isPending && lastAction === a.id}
            onClick={() => run(a.id, a.confirm)}
            className={[
              "w-full text-left px-3 py-2 border rounded-md transition-colors",
              a.destructive
                ? "border-critical-border text-critical-text hover:bg-critical-soft"
                : "border-border text-slate hover:bg-bg-warm",
              isPending && lastAction === a.id ? "opacity-60 cursor-progress" : "",
            ].join(" ")}
          >
            {isPending && lastAction === a.id ? `${a.label}…` : a.label}
          </button>
        ))}
      </div>

      {result ? (
        <div
          role="status"
          className={[
            "mt-3 text-xs px-3 py-2 rounded-md border",
            result.ok
              ? "bg-success-soft text-success-text border-success-border"
              : "bg-warning-soft text-warning-text border-warning-border",
          ].join(" ")}
        >
          {result.message}
        </div>
      ) : null}

      <p className="text-[11px] text-muted-light mt-3">
        Write paths are scaffolded — real semantics land in follow-up passes.
      </p>
    </div>
  );
}

const ACTION_FNS: Record<ActionId, (publicId: string) => Promise<ActionResult>> = {
  impersonate: impersonateCompany,
  rerun: rerunDiscovery,
  audit: viewAuditLog,
  suspend: suspendCompany,
};
