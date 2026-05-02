"use client";

import { useState, useTransition } from "react";
import { ActionList, type AdminAction } from "@/components/backstage";
import {
  type ActionResult,
  impersonateCompany,
  rerunDiscovery,
  suspendCompany,
  viewAuditLog,
} from "./actions";

type ActionId = "impersonate" | "rerun" | "audit" | "suspend";

interface ActionDef {
  id: ActionId;
  label: string;
  hint?: string;
  buttonLabel: string;
  destructive?: boolean;
  confirm?: string;
}

const ACTIONS: ActionDef[] = [
  {
    id: "impersonate",
    label: "Impersonate (read-only)",
    hint: "view the app as the org owner",
    buttonLabel: "Open",
  },
  {
    id: "rerun",
    label: "Re-run discovery",
    hint: "re-scan tools + employees",
    buttonLabel: "Run",
  },
  {
    id: "audit",
    label: "View audit log",
    hint: "all events for this org",
    buttonLabel: "Open",
  },
  {
    id: "suspend",
    label: "Suspend account",
    hint: "lose access until re-activated · reversible",
    buttonLabel: "Suspend",
    destructive: true,
    confirm:
      "Suspend this company? They'll lose access until you re-activate them. This is reversible.",
  },
];

const ACTION_FNS: Record<ActionId, (publicId: string) => Promise<ActionResult>> = {
  impersonate: impersonateCompany,
  rerun: rerunDiscovery,
  audit: viewAuditLog,
  suspend: suspendCompany,
};

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

  const adminActions: AdminAction[] = ACTIONS.map((a) => {
    const busy = isPending && lastAction === a.id;
    return {
      label: a.label,
      hint: a.hint,
      buttonLabel: busy ? "…" : a.buttonLabel,
      danger: a.destructive,
      onClick: () => run(a.id, a.confirm),
    };
  });

  return (
    <div>
      <ActionList actions={adminActions} />
      {result ? (
        <div
          role="status"
          className={[
            "mt-3 font-mono text-[11.5px] px-3 py-2 rounded-sm border",
            result.ok
              ? "bg-success-soft text-success-text border-success-border"
              : "bg-warning-soft text-warning-text border-warning-border",
          ].join(" ")}
        >
          {result.message}
        </div>
      ) : null}
      <p className="mt-3 font-mono text-[10.5px] text-muted-2 tracking-[0.04em]">
        Write paths are scaffolded — real semantics land in follow-up passes.
      </p>
    </div>
  );
}
