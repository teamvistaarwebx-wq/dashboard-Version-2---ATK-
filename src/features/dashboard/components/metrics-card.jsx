"use client";

import { useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Change } from "@/components/ui/change";
import { Sparkline } from "@/components/ui/sparkline";
import { formatKey, formatKeyRange } from "@/lib/date-keys";
import { percentChange } from "@/lib/format";
import { METRICS, granularityFor, metricSeries, metricValue, rangeTotals } from "@/mocks/analytics";
import { formatMetric } from "../lib/metric-format";
import { MetricChart } from "./metric-chart";

/**
 * One card, Shopify-home style: a row of metric tabs (value, change against
 * the comparison, sparkline), and the big line chart for whichever tab is
 * selected — current period solid maroon, comparison dashed grey.
 */
function pointLabels(bucket, granularity) {
  if (granularity === "hour") {
    const hh = `${String(bucket.hour).padStart(2, "0")}:00`;
    return { tick: hh, label: `${formatKey(bucket.start)}, ${hh}` };
  }
  if (granularity === "week") {
    return { tick: formatKey(bucket.start), label: formatKeyRange(bucket.start, bucket.end) };
  }
  return { tick: formatKey(bucket.start), label: formatKey(bucket.start, { year: true }) };
}

export function MetricsCard({ world, from, to, comparison, metric, onMetricChange }) {
  const tabsRef = useRef(null);
  const granularity = granularityFor(from, to);

  const rows = useMemo(() => {
    const totals = rangeTotals(world, from, to);
    const previous = comparison ? rangeTotals(world, comparison.from, comparison.to) : null;

    return METRICS.map((m) => {
      const current = metricSeries(world, m.id, from, to, granularity).map((bucket) => ({
        ...pointLabels(bucket, granularity),
        value: bucket.value,
      }));
      const compare = comparison
        ? metricSeries(world, m.id, comparison.from, comparison.to, granularity).map((bucket) => ({
            ...pointLabels(bucket, granularity),
            value: bucket.value,
          }))
        : null;
      const value = metricValue(m.id, totals);
      return {
        ...m,
        value,
        change: previous ? percentChange(value, metricValue(m.id, previous)) : null,
        current,
        compare,
      };
    });
  }, [world, from, to, comparison, granularity]);

  const selected = rows.find((row) => row.id === metric) ?? rows[0];

  function handleKeyDown(event) {
    const index = rows.findIndex((row) => row.id === selected.id);
    const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const target = rows[(next + rows.length) % rows.length];
    onMetricChange(target.id);
    tabsRef.current?.querySelector(`[data-metric="${target.id}"]`)?.focus();
  }

  return (
    <Card>
      <div
        ref={tabsRef}
        role="tablist"
        aria-label="Metrics"
        onKeyDown={handleKeyDown}
        className="scrollbar-subtle relative grid auto-cols-[minmax(11rem,1fr)] grid-flow-col gap-1 overflow-x-auto border-b border-border p-1.5"
      >
        {rows.map((row) => {
          const active = row.id === selected.id;
          return (
            <button
              key={row.id}
              type="button"
              role="tab"
              data-metric={row.id}
              aria-selected={active}
              aria-controls="metric-chart"
              tabIndex={active ? 0 : -1}
              onClick={() => onMetricChange(row.id)}
              className={`flex min-w-0 flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-colors ${
                active ? "bg-neutral-bg" : "hover:bg-surface-muted"
              }`}
            >
              <span className={`truncate text-13 ${active ? "font-medium text-foreground" : "text-muted"}`}>{row.label}</span>
              <span className="whitespace-nowrap font-mono text-xl font-semibold tabular-nums text-foreground">
                {formatMetric(row.kind, row.value)}
              </span>
              <span className="flex items-center justify-between gap-2">
                <Change value={row.change} />
                <Sparkline
                  values={row.current.map((point) => point.value)}
                  compare={row.compare?.map((point) => point.value)}
                  width={72}
                  height={22}
                  className="shrink-0"
                />
              </span>
            </button>
          );
        })}
      </div>

      <div id="metric-chart" role="tabpanel" aria-label={selected.label} className="px-3 pb-3 pt-4 sm:px-4">
        <div className="h-64 sm:h-72">
          <MetricChart current={selected.current} compare={selected.compare} kind={selected.kind} metricLabel={selected.label} />
        </div>

        <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-13 text-muted">
          <li className="flex items-center gap-2">
            <span className="h-0.5 w-5 rounded-full bg-chart-line" aria-hidden="true" />
            {formatKeyRange(from, to)}
          </li>
          {comparison ? (
            <li className="flex items-center gap-2">
              <span className="w-5 border-t-2 border-dashed border-chart-compare" aria-hidden="true" />
              {formatKeyRange(comparison.from, comparison.to)}
            </li>
          ) : null}
        </ul>
      </div>
    </Card>
  );
}
