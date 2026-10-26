import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";

/** The gift option form: fields beside one image. */
export default function EditGiftOptionLoading() {
  return (
    <PageSkeleton>
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </PageSkeleton>
  );
}
