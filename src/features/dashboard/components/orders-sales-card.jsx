import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCompactPrice } from "@/lib/format";
import { getOrderStats } from "../queries/get-order-stats";
import { getSalesByDay } from "../queries/get-sales-by-day";
import { MetricChart } from "./metric-chart";

export async function OrdersSalesCard() {
  const [stats, series] = await Promise.all([getOrderStats(), getSalesByDay()]);

  // Only primitives cross into the client component — no documents, no dates.
  const points = series.map((day) => ({ tick: day.label, label: day.label, value: day.orders }));

  return (
    <Card
      title="Orders & sales"
      subtitle={`Last ${stats.windowDays} days`}
      action={
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-13 font-medium text-brand-text hover:underline"
        >
          View Orders
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      }
    >
      <dl className="flex flex-wrap gap-x-10 gap-y-4 px-5 pb-5 pt-4">
        <Figure label="Orders" value={stats.orders} />
        <Figure label="Revenue" value={formatCompactPrice(stats.revenue)} />
        <Figure
          label="Avg. order value"
          value={formatCompactPrice(stats.averageOrderValue)}
        />
      </dl>

      <div className="h-56 border-t border-border px-3 py-4">
        <MetricChart current={points} kind="number" metricLabel="Orders" />
      </div>
    </Card>
  );
}

function Figure({ label, value }) {
  return (
    <div>
      <dd className="font-mono text-xl font-semibold">
        {value}
      </dd>
      <dt className="mt-0.5 text-xs text-muted">
        {label}
      </dt>
    </div>
  );
}
