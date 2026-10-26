"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/**
 * Centred modal on a native <dialog>, for short tasks that need a decision:
 * export, import, confirm. Mounted only while open, like Drawer.
 *
 * `footer` is pinned under a scrolling body, so long content (an import
 * preview) never pushes the buttons off-screen.
 */
const WIDTHS = {
  sm: "w-[min(26rem,calc(100vw-2rem))]",
  md: "w-[min(36rem,calc(100vw-2rem))]",
  lg: "w-[min(56rem,calc(100vw-2rem))]",
};

export function Modal({ title, onClose, children, footer, size = "md", dismissible = true }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleCancel(event) {
    event.preventDefault();
    if (dismissible) onClose();
  }

  function handleClick(event) {
    if (!dismissible || event.target !== dialogRef.current) return;
    const box = dialogRef.current.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    ) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleClick}
      className={`modal-panel m-auto max-h-[min(44rem,calc(100dvh-2rem))] max-w-none overflow-hidden rounded-2xl border border-border bg-surface p-0 text-foreground shadow-popover ${
        WIDTHS[size] ?? WIDTHS.md
      }`}
    >
      <div className="flex max-h-[inherit] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3.5">
          <h2 id={titleId} className="text-base font-semibold tracking-tight">
            {title}
          </h2>
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-muted transition hover:bg-neutral-bg hover:text-foreground"
            >
              <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-muted/60 px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
