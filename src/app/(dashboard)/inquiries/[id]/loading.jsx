import { DetailSkeleton, PageSkeleton } from "@/components/ui/skeleton";

/** One enquiry: its details, then the status controls. */
export default function InquiryDetailLoading() {
  return (
    <PageSkeleton hasAction>
      <DetailSkeleton />
    </PageSkeleton>
  );
}
