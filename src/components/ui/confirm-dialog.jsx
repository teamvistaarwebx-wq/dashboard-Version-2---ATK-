"use client";

import { useEffect, useId, useRef } from "react";

/**
 * "Are you sure?" for the destructive actions — built on the native <dialog>.
 *
 * `showModal()` gives us the focus trap, the Escape key, an inert page behind
 * it and top-layer stacking (so it cannot end up under the sticky header) for
 * free. A <div> overlay would need all four written by hand.
 *
 * The caller mounts it only while it is open, so a table of twenty rows
 * carries one dialog rather than twenty hidden ones.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pending = false,
  error = "",
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    // showModal(), not the `open` attribute — only the former reaches the top
    // layer, traps focus and paints ::backdrop.
    dialogRef.current?.showModal();
  }, []);

  function handleEscape(event) {
    // Let React stay the single owner of whether this is mounted: swallow the
    // browser's own close and route Escape through the same callback the
    // Cancel button uses.
    event.preventDefault();
    if (!pending) onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleEscape}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/40"
    >
      <div className="p-6">
        <h2
          id={titleId}
          className="font-newsreader text-lg font-semibold text-brand"
        >
          {title}
        </h2>

        {description ? (
          <p className="mt-2 font-nunito text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}

        {/* Kept mounted so a screen reader announces a failure that arrives
            after the dialog is already open. */}
        <p
          aria-live="polite"
          className="mt-3 min-h-4 font-nunito text-xs text-danger"
        >
          {error}
        </p>

        <div className="mt-4 flex justify-end gap-3">
          {/* Focused first on purpose: Enter on a destructive dialog should
              back out, not confirm. */}
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-border bg-surface px-4 py-2 font-nunito text-sm font-semibold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-lg bg-danger px-4 py-2 font-nunito text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
