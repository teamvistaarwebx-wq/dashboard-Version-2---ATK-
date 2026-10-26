import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";

/** The banner form: two image drop zones, then the fields. */
export default function NewBannerLoading() {
  return (
    <PageSkeleton>
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </PageSkeleton>
  );
}
