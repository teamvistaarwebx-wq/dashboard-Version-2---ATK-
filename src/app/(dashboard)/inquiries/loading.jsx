import { PageSkeleton, Skeleton, TableSkeleton } from "@/components/ui/skeleton";

/** Search box and a status select, then the enquiry table. */
export default function InquiriesLoading() {
  return (
    <PageSkeleton hasAction>
      <div className="flex flex-wrap items-end gap-3">
        <Skeleton className="h-10 w-80 max-w-full rounded-md" />
        <Skeleton className="h-10 w-40 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>

      <div className="mt-6">
        <TableSkeleton rows={8} columns={5} />
      </div>
    </PageSkeleton>
  );
}
