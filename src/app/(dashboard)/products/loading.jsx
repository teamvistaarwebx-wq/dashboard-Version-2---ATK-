import {
  FilterBarSkeleton,
  PageSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

/**
 * What the router shows the instant Products is clicked.
 *
 * This file is not decoration. Without a `loading` boundary a dynamic route
 * has no static shell, so `<Link>` prefetch has nothing to fetch and the
 * router holds the *previous* screen in place, untouched and unresponsive,
 * until the whole RSC payload arrives. Adding it is what turns a click from
 * "nothing happened" into an immediate route change.
 */
export default function ProductsLoading() {
  return (
    <PageSkeleton hasAction>
      <FilterBarSkeleton />
      <div className="mt-6">
        <TableSkeleton rows={8} columns={5} />
      </div>
    </PageSkeleton>
  );
}
