"use client";

import { useMemo } from "react";
import { Page } from "@/components/layout/page";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { useUrlState } from "@/hooks/use-url-state";
import { useMockStore } from "@/mocks/store";
import { COMPARE_OPTIONS, comparisonRange, parseRange, resolvePreset } from "../lib/date-range";
import { LiveViewCard } from "./live-view-card";
import { MetricsCard } from "./metrics-card";
import { RecentInquiriesCard } from "./recent-inquiries-card";
import { RegionCard } from "./region-card";
import { TopProductsCard } from "./top-products-card";

/**
 * Home. The range and comparison live in the URL; every card below follows
 * them, so changing the range changes the metrics, the comparison line, the
 * region table, the best sellers and the inquiries list together.
 *
 * The segmented control is a shortcut to four of the picker's presets; the
 * picker beside it still holds every preset and custom dates.
 */
const QUICK_RANGES = [
  { value: "last7", label: "7D", ariaLabel: "Last 7 days" },
  { value: "last30", label: "30D", ariaLabel: "Last 30 days" },
  { value: "last90", label: "90D", ariaLabel: "Last 90 days" },
  { value: "thisYear", label: "YTD", ariaLabel: "This year" },
];

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

  const compareLabel = COMPARE_OPTIONS.find((option) => option.value === compare)?.label.toLowerCase();

  // Clamped to the first day of data, the same way the picker's presets are,
  // so "YTD" stays lit when the year began before the data did.
  function clampedPreset(id) {
    const range = resolvePreset(id, world.todayKey);
    return { from: range.from < world.startKey ? world.startKey : range.from, to: range.to };
  }
  const quickValue = QUICK_RANGES.find((option) => {
    const range = clampedPreset(option.value);
    return range.from === from && range.to === to;
  })?.value;

  return (
    <Page
      title="Overview"
      description="Sales, storefront traffic and corporate enquiries at a glance."
      actions={
        <>
          <Segmented
            label="Quick range"
            options={QUICK_RANGES}
            value={quickValue}
            onChange={(id) => setParams(clampedPreset(id))}
          />
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
          <div className="w-56">
            <Select
              id="compare"
              aria-labelledby="compare-label"
              value={compare}
              onValueChange={(value) => setParams({ compare: value === "previous" ? null : value })}
              options={COMPARE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.value === "none" ? option.label : `vs ${option.label.toLowerCase()}`,
              }))}
            />
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <MetricsCard
          world={world}
          from={from}
          to={to}
          comparison={comparison}
          compareLabel={compareLabel}
          metric={metric}
          onMetricChange={(id) => setParams({ metric: id === "sales" ? null : id })}
        />

        <div className="grid gap-5 lg:grid-cols-3">
          <LiveViewCard world={world} />
          <RegionCard world={world} from={from} to={to} comparison={comparison} className="lg:col-span-2" />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <TopProductsCard world={world} productById={store.productById} from={from} to={to} />
          <RecentInquiriesCard inquiries={store.inquiries} from={from} to={to} />
        </div>
      </div>
    </Page>
  );
}
