"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * Lightweight modal — no portal lib. Renders absolutely on top of the page
 * with a click-to-dismiss overlay. ESC closes. Body scroll is locked while
 * open. Used for AI Classify and New Template flows on the Templates page.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 grid place-items-center bg-black/40"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-md shadow-stk-lg border border-border"
        style={{ width }}
      >
        <header className="px-5 py-4 border-b border-border-soft flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-heading">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-light hover:text-slate text-lg leading-none"
          >
            ✕
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <footer className="px-5 py-3 border-t border-border-soft">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
