"use client";

import React, { useEffect, useId, useMemo, useRef } from "react";

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"),
  );
}

export function Modal(props: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional: element to focus initially (by ref). */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const { open, title, description, onClose, children, footer, initialFocusRef } =
    props;

  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const describedBy = useMemo(() => {
    return description ? descId : undefined;
  }, [description, descId]);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    if (!panel) return;

    const focusTarget =
      initialFocusRef?.current ?? getFocusableElements(panel)[0] ?? panel;

    // Move focus into dialog on open
    setTimeout(() => focusTarget.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      // Trap focus
      const focusables = getFocusableElements(panel);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Restore focus to opener
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose, initialFocusRef]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="presentation"
      aria-hidden={false}
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onMouseDown={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={describedBy}
          className={[
            "w-full max-w-xl rounded-2xl bg-white shadow-xl border border-slate-200",
            "focus:outline-none",
          ].join(" ")}
          tabIndex={-1}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <header className="px-5 pt-5 pb-3 border-b border-slate-100">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm text-slate-600">
                {description}
              </p>
            ) : null}
          </header>

          <section className="px-5 py-4">{children}</section>

          {footer ? (
            <footer className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
    </div>
  );
}
