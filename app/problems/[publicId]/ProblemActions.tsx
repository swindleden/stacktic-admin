"use client";

/**
 * ProblemActions — three buttons (Acknowledge / Resolve / Dismiss) plus
 * an inline resolution-note textarea that reveals when Resolve or
 * Dismiss is clicked. The note is optional but useful — it lands in
 * `btp_resolution_note` and shows on the problem detail forever.
 *
 * Acknowledge takes no note (it's not a closure transition).
 * Resolve and Dismiss share the note input + a confirm/cancel pair.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  acknowledgeProblem,
  dismissProblem,
  resolveProblem,
  type ActionResult,
} from "./actions";

type Mode = "idle" | "resolving" | "dismissing";

export function ProblemActions({
  publicId,
  status,
}: {
  publicId: string;
  status: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [note, setNote] = useState("");
  const router = useRouter();

  const isOpen = status === 1;
  const isAcknowledged = status === 2;
  const isClosed = status >= 3;

  function ack() {
    startTransition(async () => {
      const res = await acknowledgeProblem(publicId);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  function confirm() {
    startTransition(async () => {
      const fn = mode === "resolving" ? resolveProblem : dismissProblem;
      const res = await fn(publicId, note);
      setResult(res);
      if (res.ok) {
        setMode("idle");
        setNote("");
        router.refresh();
      }
    });
  }

  function cancel() {
    setMode("idle");
    setNote("");
    setResult(null);
  }

  // ── Inline confirm form for Resolve / Dismiss ───────────────────
  if (mode !== "idle" && !isClosed) {
    const verb = mode === "resolving" ? "Resolve" : "Dismiss";
    const tone =
      mode === "resolving"
        ? "border-success-border text-success-text hover:bg-success-soft"
        : "border-border text-muted hover:bg-bg-warm";
    return (
      <div className="space-y-2">
        <label className="block">
          <span className="block text-xs text-muted mb-1">
            Resolution note (optional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={
              mode === "resolving"
                ? "What did you change? (Operators future-you will thank you.)"
                : "Why are you dismissing this?"
            }
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-slate placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent"
          />
          <span className="block text-[11px] text-muted-light mt-1 text-right">
            {note.length}/2000
          </span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirm}
            disabled={isPending}
            className={[
              "flex-1 text-sm px-3 py-2 border rounded-md transition-colors",
              tone,
              isPending ? "cursor-progress opacity-60" : "",
            ].join(" ")}
          >
            {isPending ? `${verb}…` : verb}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={isPending}
            className="text-sm px-3 py-2 border border-border rounded-md text-muted hover:bg-bg-warm"
          >
            Cancel
          </button>
        </div>
        {result && !result.ok ? (
          <div
            role="status"
            className="mt-2 text-xs px-3 py-2 rounded-md border bg-warning-soft text-warning-text border-warning-border"
          >
            {result.message}
          </div>
        ) : null}
      </div>
    );
  }

  // ── Default three-button layout ─────────────────────────────────
  return (
    <div className="space-y-2">
      <Btn onClick={ack} disabled={isPending || !isOpen}>
        Acknowledge
      </Btn>
      <Btn
        onClick={() => setMode("resolving")}
        disabled={isPending || isClosed}
        tone="good"
      >
        Resolve…
      </Btn>
      <Btn
        onClick={() => setMode("dismissing")}
        disabled={isPending || isClosed}
        tone="muted"
      >
        Dismiss…
      </Btn>

      {isAcknowledged ? (
        <p className="text-[11px] text-muted-light">
          Acknowledged — still open until resolved or dismissed.
        </p>
      ) : null}

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
    </div>
  );
}

function Btn({
  onClick,
  disabled,
  tone = "neutral",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "good" | "muted";
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "good"
      ? "border-success-border text-success-text hover:bg-success-soft"
      : tone === "muted"
        ? "border-border text-muted hover:bg-bg-warm"
        : "border-border text-slate hover:bg-bg-warm";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-full text-left px-3 py-2 border rounded-md text-sm transition-colors",
        toneCls,
        disabled ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
