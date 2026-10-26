import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdmin } from "@/lib/auth/dal";
import { MOCK_MODE } from "@/lib/mock-mode";
import { GiftingRequests } from "@/features/dashboard/components/gifting-requests";
import { OrdersSalesCard } from "@/features/dashboard/components/orders-sales-card";
import { RecentActivity } from "@/features/dashboard/components/recent-activity";
import { PanelSkeleton } from "@/features/dashboard/components/panel-skeletons";
import { HomeScreen } from "@/features/dashboard/components/home-screen";

export const metadata = { title: "Home | ATK Gifting Admin" };

/**
 * Every panel fetches its own data behind its own Suspense boundary, so the
 * header paints immediately and each card fills in as its aggregation lands.
 *
 * The catalogue KPIs (total products, sold out), stock by category, low stock
 * and quick actions were removed from Home in the redesign.
 */
export default async function DashboardPage() {
  if (MOCK_MODE) {
    return (
      <Suspense>
        <HomeScreen />
      </Suspense>
    );
  }

  await requireAdmin();

  return (
    <>
      <PageHeader title="Home" />

      <div className="grid gap-4 px-4 py-6 sm:px-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Suspense fallback={<PanelSkeleton height="h-96" />}>
            <OrdersSalesCard />
          </Suspense>

          <Suspense fallback={<PanelSkeleton height="h-80" />}>
            <RecentActivity />
          </Suspense>
        </div>

        <div className="flex flex-col gap-4">
          <Suspense fallback={<PanelSkeleton height="h-56" />}>
            <GiftingRequests />
          </Suspense>
        </div>
      </div>
    </>
  );
}
