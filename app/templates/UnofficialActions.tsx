"use client";

/**
 * Row-level actions on the Pending tab. Three buttons:
 *
 *   Approve — flip to Active. If the template is private, also
 *             promote to global by nulling out tpl_org_id.
 *   Merge   — fold into another template (stubbed; coming soon).
 *   Ignore  — flip to Ignored. Still matches during OAuth scan +
 *             searchCatalog; just disappears from the operator's
 *             triage queue.
 *
 * Component name kept as `UnofficialActions` for now to avoid
 * touching the page's import path; will rename in a follow-up.
 */
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveTemplate,
  ignoreTemplate,
  mergeTemplate,
} from "./actions";

export function UnofficialActions({ tplId }: { tplId: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: "approve" | "merge" | "ignore") {
    startTransition(async () => {
      const res =
        action === "approve"
          ? await approveTemplate(tplId)
          : action === "merge"
            ? await mergeTemplate(tplId, 0)
            : await ignoreTemplate(tplId);
      if (typeof window !== "undefined") window.alert(res.message);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <ActionBtn onClick={() => run("approve")} disabled={isPending}>
        Approve
      </ActionBtn>
      <ActionBtn onClick={() => run("merge")} disabled={isPending}>
        Merge…
      </ActionBtn>
      <ActionBtn onClick={() => run("ignore")} disabled={isPending} subtle>
        Ignore
      </ActionBtn>
    </div>
  );
}

function ActionBtn({
  onClick,
  children,
  disabled,
  subtle,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "text-xs px-2 py-1 border rounded transition-colors",
        subtle
          ? "border-border text-muted hover:bg-bg-warm"
          : "border-border text-slate hover:bg-bg-warm",
        disabled ? "opacity-60 cursor-progress" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
