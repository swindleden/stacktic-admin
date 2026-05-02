"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * Lightweight modal — no portal lib. Renders absolutely on top of the page
 * with a click-to-dismiss overlay. ESC closes. Body scroll is locked while
 * open. Used for AI Classify and New Template flows on the Templates page.
 *
 * Visual chrome matches the Backstage panel system (paper-4 fill, line
 * border, paper-3 header strip).
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
      className="fixed inset-0 z-40 grid place-items-center bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-paper-4 rounded-md shadow-stk-lg border border-line overflow-hidden"
        style={{ width }}
      >
        <header className="bg-paper-3 px-5 py-3 border-b border-line flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-[22px] font-normal tracking-[-0.015em] leading-none text-ink">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1.5 font-mono text-[11.5px] text-muted">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-2 hover:text-ink text-[16px] leading-none"
          >
            ✕
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <footer className="px-5 py-3 border-t border-line bg-paper-3">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}
