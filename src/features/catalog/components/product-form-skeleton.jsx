import { Skeleton } from "@/components/ui/skeleton";

/**
 * Stands in for ProductForm while its two reads resolve.
 *
 * Shaped like the real form rather than like a generic block, which matters
 * more here than it does in a table fallback: the panel slides in carrying
 * this, so it is the entire first impression of the drawer, and a shape that
 * rearranges itself when the data lands would undo the point of opening fast.
 *
 * It mirrors the same three-part column the form uses — a scrolling body inside
 * the drawer's `min-h-0 flex-1` slot, above a pinned footer — so the Save and
 * Cancel buttons do not move by a pixel when the form replaces it.
 *
 * The four collapsed <details> sections are drawn as bare summary bars, because
 * closed is how they arrive. `overflow-hidden` rather than the form's
 * `overflow-y-auto`: there is nothing here worth scrolling to.
 */
export function ProductFormSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-hidden="true">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-6 py-5">
        {/* Photos */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <div className="flex gap-3">
            <Skeleton className="h-24 w-24 rounded-lg" />
            <Skeleton className="h-24 w-24 rounded-lg" />
          </div>
        </div>

        <Field />
        {/* The SKU / web address line that sits tight under the name. */}
        <Skeleton className="-mt-3 h-3 w-64 max-w-full" />

        <div className="grid grid-cols-2 gap-4">
          <Field />
          <Field />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field />
          <Field />
        </div>

        <Field />

        <div className="grid grid-cols-2 gap-4">
          <Field />
          <Field />
        </div>

        {/* Description — rows={7} on the real textarea. */}
        <Field height="h-44" />

        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-11 rounded-lg" />
        ))}
      </div>

      <footer className="shrink-0 border-t border-border px-6 py-4">
        <div className="flex items-center justify-end gap-3">
          <Skeleton className="h-11 w-24 rounded-lg" />
          <Skeleton className="h-11 w-32 rounded-lg" />
        </div>
      </footer>
    </div>
  );
}

/** Label above input, at the `gap-1.5` the field components share. */
function Field({ height = "h-11" }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-3 w-28" />
      <Skeleton className={`${height} rounded-lg`} />
    </div>
  );
}
