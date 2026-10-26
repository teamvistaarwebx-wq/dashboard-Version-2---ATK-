"use client";

import { useMemo } from "react";
import { Page } from "@/components/layout/page";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select } from "@/components/ui/select";
import { useUrlState } from "@/hooks/use-url-state";
import { useMockStore } from "@/mocks/store";
import { COMPARE_OPTIONS, comparisonRange, parseRange } from "../lib/date-range";
import { LiveViewCard } from "./live-view-card";
import { MetricsCard } from "./metrics-card";
import { RecentInquiriesCard } from "./recent-inquiries-card";
import { RegionCard } from "./region-card";
import { TopProductsCard } from "./top-products-card";

/**
 * Home. The range and comparison live in the URL; every card below follows
 * them, so changing the range changes the metrics, the comparison line, the
 * region table, the best sellers and the inquiries list together.
 */
export function HomeScreen() {
  const store = useMockStore();
  const { world } = store;
  const [params, setParams] = useUrlState();

  const { from, to, compare } = parseRange(params, { today: world.todayKey, min: world.startKey, fallback: "last30" });
  const metric = params.get("metric") ?? "sales";

  const comparison = useMemo(() => {
    const range = comparisonRange(from, to, compare, world.todayKey);
    if (!range || range.to < world.startKey) return null;
    return { from: range.from < world.startKey ? world.startKey : range.from, to: range.to };
  }, [from, to, compare, world]);

  return (
    <Page
      title="Home"
      actions={
        <>
          <DateRangePicker
            from={from}
            to={to}
            today={world.todayKey}
            min={world.startKey}
            onApply={(range) => setParams({ from: range.from, to: range.to })}
          />
          <span id="compare-label" className="sr-only">
            Compare to
          </span>
          <div className="w-52">
            <Select
              id="compare"
              size="sm"
              aria-labelledby="compare-label"
              value={compare}
              onValueChange={(value) => setParams({ compare: value === "previous" ? null : value })}
              options={COMPARE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.value === "none" ? option.label : `Compare: ${option.label.toLowerCase()}`,
              }))}
            />
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <MetricsCard
          world={world}
          from={from}
          to={to}
          comparison={comparison}
          metric={metric}
          onMetricChange={(id) => setParams({ metric: id === "sales" ? null : id })}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <LiveViewCard world={world} />
          <RegionCard world={world} from={from} to={to} comparison={comparison} className="lg:col-span-2" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TopProductsCard world={world} productById={store.productById} from={from} to={to} />
          <RecentInquiriesCard inquiries={store.inquiries} from={from} to={to} />
        </div>
      </div>
    </Page>
  );
}
