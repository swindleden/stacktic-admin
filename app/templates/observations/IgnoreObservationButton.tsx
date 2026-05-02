"use client";

/**
 * IgnoreObservationButton — one-click triage from the Observations
 * listing. Two-step confirm to prevent accidental clicks (the action
 * isn't destructive — observation just stops appearing in the queue —
 * but the operator should be deliberate).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ignoreObservation } from "./actions";

export function IgnoreObservationButton({
  normalizedName,
}: {
  normalizedName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onClick(e: React.MouseEvent) {
    // Don't bubble — the row itself is a link.
    e.preventDefault();
    e.stopPropagation();
    if (!confirm) {
      setConfirm(true);
      return;
    }
    startTransition(async () => {
      const res = await ignoreObservation(normalizedName);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.message);
        setConfirm(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className={[
          "text-xs px-2 py-1 rounded border transition-colors disabled:opacity-60",
          confirm
            ? "border-warning-border text-warning-text bg-warning-soft hover:bg-warning-soft/80"
            : "border-border text-muted hover:bg-bg-warm",
        ].join(" ")}
      >
        {isPending ? "Ignoring…" : confirm ? "Confirm" : "Ignore"}
      </button>
      {error ? (
        <span className="ml-2 text-[11px] text-warning-text">{error}</span>
      ) : null}
    </>
  );
}
