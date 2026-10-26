/**
 * The placeholder vocabulary shared by every `loading.jsx` and Suspense
 * fallback outside the dashboard's own panels.
 *
 * These exist to be *approximately right*, not pixel-perfect: a fallback whose
 * height is close to what replaces it keeps the page from lurching when the
 * data lands, and that is most of the value. Chasing an exact match makes the
 * skeleton a second copy of the component that has to be maintained alongside
 * it.
 *
 * All server components — nothing here has state, and none of it should cost a
 * byte of client JavaScript.
 */

/** The one animated primitive. Everything below is a composition of it. */
export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-border/60 ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Stands in for `PageHeader`. Matched to its real padding and border so the
 * sticky bar does not shift by a pixel when the page itself renders — this one
 * *is* worth being exact about, because the header is the part of the screen
 * the eye is already resting on.
 */
export function PageHeaderSkeleton({ hasAction = false }) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-start justify-between gap-4 border-b border-border bg-background px-6 py-5 sm:px-8">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      </div>

      {hasAction ? <Skeleton className="h-11 w-36 rounded-lg" /> : null}
    </header>
  );
}

/** The search box and chip row above a table. */
export function FilterBarSkeleton({ chips = 6 }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Skeleton className="h-10 w-72 max-w-full rounded-full" />

      {Array.from({ length: chips }, (_, i) => (
        <Skeleton key={i} className="h-10 w-28 rounded-full" />
      ))}
    </div>
  );
}

/**
 * A table's worth of rows inside the real bordered frame, so the container
 * itself never pops into existence — only its contents fill in.
 *
 * `rows` defaults to a full page. Rendering fewer would make the page grow as
 * the data arrives, which is the jump this is meant to prevent.
 */
export function TableSkeleton({ rows = 8, columns = 5 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex gap-4 border-b border-border bg-background px-4 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>

      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columns }, (_, col) => (
              <div key={col} className="flex flex-1 items-center gap-3">
                {/* The first cell of every row carries a thumbnail in each of
                    these tables, so it gets a square rather than a bar. */}
                {col === 0 ? (
                  <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                ) : null}
                <Skeleton className="h-3.5 w-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Banners and other card-shaped lists. */
export function CardListSkeleton({ count = 3, height = "h-36" }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`${height} rounded-xl`} />
      ))}
    </div>
  );
}

/**
 * A detail screen: a couple of stacked panels rather than a list.
 */
export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

/**
 * The full-page fallback: header bar plus a body. Every `loading.jsx` in the
 * dashboard is a one-line call to this with a different body.
 */
export function PageSkeleton({ hasAction = false, children }) {
  return (
    <>
      <PageHeaderSkeleton hasAction={hasAction} />
      <div className="px-6 py-6 sm:px-8">{children}</div>
    </>
  );
}
