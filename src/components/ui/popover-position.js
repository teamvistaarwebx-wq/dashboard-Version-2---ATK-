/**
 * Where a dropdown list should sit relative to the control that opened it —
 * shared by Select and SuggestField, which both render their list as a
 * top-layer popover (see components/ui/select.jsx for why).
 *
 * Opens downward unless the room below is short AND there is more above, so a
 * field near the bottom of a drawer flips up instead of running off-screen.
 * Returned as an inline style for a `position: fixed` element, since popovers
 * are placed against the viewport.
 */

/** Below this much room under the control, the list opens upward instead. */
const MIN_SPACE_BELOW = 260;
const GAP = 4;

export function popoverPosition(anchor) {
  const rect = anchor.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom;
  const upward = below < MIN_SPACE_BELOW && rect.top > below;

  return {
    left: rect.left,
    minWidth: rect.width,
    ...(upward
      ? { bottom: window.innerHeight - rect.top + GAP, maxHeight: rect.top - GAP * 4 }
      : { top: rect.bottom + GAP, maxHeight: below - GAP * 4 }),
  };
}

/** The list's own classes — one look for every dropdown in the admin. */
export const POPOVER_LIST_CLASS =
  "scrollbar-subtle-dark fixed m-0 overflow-y-auto rounded-xl bg-surface p-1 text-sm text-foreground shadow-popover [inset:auto]";
