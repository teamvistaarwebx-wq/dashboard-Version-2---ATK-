import {
  FilterBarSkeleton,
  PageSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

/** Three stock chips rather than the catalogue's category row. */
export default function InventoryLoading() {
  return (
    <PageSkeleton hasAction>
      <FilterBarSkeleton chips={3} />
      <div className="mt-6">
        <TableSkeleton rows={8} columns={5} />
      </div>
    </PageSkeleton>
  );
}
