import { CardListSkeleton, PageSkeleton } from "@/components/ui/skeleton";

/** The invite form and the team list beneath it. */
export default function SettingsLoading() {
  return (
    <PageSkeleton>
      <CardListSkeleton count={2} height="h-52" />
    </PageSkeleton>
  );
}
