import { CardListSkeleton, PageSkeleton } from "@/components/ui/skeleton";

/** Two short lists of image rows. */
export default function GiftOptionsLoading() {
  return (
    <PageSkeleton>
      <CardListSkeleton count={4} height="h-28" />
    </PageSkeleton>
  );
}
