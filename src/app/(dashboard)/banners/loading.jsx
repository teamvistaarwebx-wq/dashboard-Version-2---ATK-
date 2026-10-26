import { CardListSkeleton, PageSkeleton } from "@/components/ui/skeleton";

/** Cards, not rows — a banner is its artwork. */
export default function BannersLoading() {
  return (
    <PageSkeleton hasAction>
      <CardListSkeleton count={3} height="h-44" />
    </PageSkeleton>
  );
}
