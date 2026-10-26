"use client";

import dynamic from "next/dynamic";

/**
 * Lazy boundary for the line chart. chart.js is ~60KB and paints to a canvas,
 * so server-rendering it would produce an empty element that is thrown away;
 * `ssr: false` splits it into its own chunk fetched after hydration.
 */
export const MetricChart = dynamic(
  () => import("./metric-line-chart").then((mod) => mod.MetricLineChart),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-surface-muted" />,
  }
);
