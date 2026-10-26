import { PageSkeleton, TableSkeleton } from "@/components/ui/skeleton";

/** The stock ledger — a plain table, no filter bar. */
export default function MovementsLoading() {
  return (
    <PageSkeleton>
      <TableSkeleton rows={10} columns={6} />
    </PageSkeleton>
  );
}
