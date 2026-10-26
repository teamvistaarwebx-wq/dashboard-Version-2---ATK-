import {
  FilterBarSkeleton,
  PageSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

/**
 * The instant shell for Made to Order — without it the router has nothing to
 * prefetch and holds the previous screen until the payload lands. Same reason
 * as products/loading.jsx.
 */
export default function MadeToOrderLoading() {
  return (
    <PageSkeleton hasAction>
      <FilterBarSkeleton />
      <div className="mt-6">
        <TableSkeleton rows={8} columns={4} />
      </div>
    </PageSkeleton>
  );
}
