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
 * The KPI strip and the chart under it. Each tile in the strip is a tab
 * (value, change against the comparison, sparkline); the chart card below
 * plots whichever is selected — current period solid maroon, comparison
 * dashed grey.
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

export function MetricsCard({ world, from, to, comparison, compareLabel, metric, onMetricChange }) {
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
    <>
      <Card>
        <div
          ref={tabsRef}
          role="tablist"
          aria-label="Metrics"
          onKeyDown={handleKeyDown}
          className="scrollbar-subtle relative grid auto-cols-[minmax(12.5rem,1fr)] grid-flow-col divide-x divide-border overflow-x-auto"
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
                className={`relative flex min-w-0 flex-col gap-2 px-5 py-4 text-left transition-colors focus-visible:-outline-offset-2 ${
                  active ? "bg-surface-muted/70" : "hover:bg-surface-muted/50"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate text-13 ${active ? "font-medium text-foreground" : "text-muted"}`}>{row.label}</span>
                  <Sparkline
                    values={row.current.map((point) => point.value)}
                    compare={row.compare?.map((point) => point.value)}
                    width={56}
                    height={18}
                    className="shrink-0"
                  />
                </span>
                <span className="whitespace-nowrap text-[26px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
                  {formatMetric(row.kind, row.value)}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                  <Change value={row.change} />
                  {comparison ? <span className="truncate">vs {compareLabel}</span> : null}
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-0.5 transition-colors ${active ? "bg-brand" : "bg-transparent"}`}
                />
              </button>
            );
          })}
        </div>
      </Card>

      <Card
        id="metric-chart"
        role="tabpanel"
        aria-label={selected.label}
        title={selected.label}
        subtitle={comparison ? `${formatKeyRange(from, to)} compared with ${formatKeyRange(comparison.from, comparison.to)}` : formatKeyRange(from, to)}
        action={
          <ul className="hidden items-center gap-4 text-xs text-muted sm:flex">
            <li className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-chart-line" aria-hidden="true" />
              Current
            </li>
            {comparison ? (
              <li className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-chart-compare" aria-hidden="true" />
                Comparison
              </li>
            ) : null}
          </ul>
        }
      >
        <div className="px-3 pb-4 pt-4 sm:px-4">
          <div className="h-64 sm:h-80">
            <MetricChart current={selected.current} compare={selected.compare} kind={selected.kind} metricLabel={selected.label} />
          </div>
        </div>
      </Card>
    </>
  );
}
