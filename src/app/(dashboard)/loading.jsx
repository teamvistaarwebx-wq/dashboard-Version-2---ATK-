import { PageHeaderSkeleton, Skeleton } from "@/components/ui/skeleton";

/**
 * The dashboard's own route-transition fallback, shaped like the panel grid
 * so the screen does not reflow twice on the way in.
 */
export default function DashboardLoading() {
  return (
    <>
      <PageHeaderSkeleton />

      <div className="grid gap-4 px-4 py-6 sm:px-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </>
  );
}
