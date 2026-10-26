"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/**
 * Slide-over panel on a native <dialog> + showModal(): focus trap, Escape, an
 * inert page behind it and top-layer stacking with no JS of our own.
 *
 * `side` is "right" (detail panels, the default), "left" (the mobile nav) or
 * "bottom" (sheets on phones). The shell owns the header; `children` gets a
 * `min-h-0 flex-1` column so a form inside can scroll above its own footer.
 *
 * Side panels float 8px in from the viewport edge with rounded corners, so
 * they read as a layer over the page rather than part of it.
 *
 * Mounted only while open. The slide is CSS (`.drawer-panel` in globals.css).
 */
const SIDES = {
  right: "my-2 ml-auto mr-2 h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[min(32rem,calc(100vw-1rem))] rounded-2xl border shadow-popover",
  left: "my-2 ml-2 mr-auto h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[min(18rem,85vw)] overflow-hidden rounded-2xl border shadow-popover",
  bottom: "m-0 mt-auto max-h-[90dvh] w-full max-w-none rounded-t-2xl border-t",
};

export function Drawer({ title, onClose, children, side = "right", hideHeader = false, className = "" }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleEscape(event) {
    // React owns whether this is mounted, so swallow the browser's own close
    // and route Escape through the same callback the X button uses.
    event.preventDefault();
    onClose();
  }

  /** A click on the backdrop lands on the <dialog> itself, outside its box. */
  function handleBackdropClick(event) {
    if (event.target !== dialogRef.current) return;

    const box = dialogRef.current.getBoundingClientRect();
    const outside =
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom;

    if (outside) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      data-side={side}
      aria-labelledby={hideHeader ? undefined : titleId}
      aria-label={hideHeader ? title : undefined}
      onCancel={handleEscape}
      onClick={handleBackdropClick}
      className={`drawer-panel max-w-none border-border bg-surface p-0 text-foreground ${SIDES[side] ?? SIDES.right} ${className}`}
    >
      <div className="flex h-full max-h-[inherit] flex-col">
        {hideHeader ? null : (
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3.5">
            <h2 id={titleId} className="text-base font-semibold tracking-tight text-foreground">
              {title}
            </h2>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-muted transition hover:bg-neutral-bg hover:text-foreground"
            >
              <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </button>
          </header>
        )}

        {children}
      </div>
    </dialog>
  );
}
