import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

/**
 * Orders is the one list that does not use `PageHeader` — it lays itself out
 * in a centred `<main>` — so this fallback mirrors that shell rather than the
 * sticky bar the other sections share.
 */
export default function OrdersLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-24" />
      </header>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <Skeleton className="h-10 w-72 max-w-full rounded-md" />
        <Skeleton className="h-10 w-40 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>

      <div className="mt-6">
        <TableSkeleton rows={8} columns={5} />
      </div>
    </main>
  );
}
