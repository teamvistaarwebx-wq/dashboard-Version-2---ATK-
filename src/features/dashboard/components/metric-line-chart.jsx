"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { subscribeEffectiveTheme } from "@/lib/theme";
import { formatMetric, formatMetricCompact } from "../lib/metric-format";

/**
 * Registered à la carte rather than `chart.js/auto`, which would pull in every
 * controller and scale for a chart that needs a handful.
 */
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

/**
 * Canvas cannot read CSS variables, so the theme tokens are read off the
 * document and re-read when the theme changes (switch or system).
 */
const TOKENS = ["--chart-line", "--chart-compare", "--chart-grid", "--muted", "--foreground", "--surface", "--border", "--geist-mono"];


function readTokens() {
  const style = getComputedStyle(document.documentElement);
  return TOKENS.map((name) => style.getPropertyValue(name).trim()).join("|");
}

function useTheme() {
  const raw = useSyncExternalStore(subscribeEffectiveTheme, readTokens, () => "");
  return useMemo(() => {
    const [line, compare, grid, muted, foreground, surface, border, mono] = raw.split("|");
    return { line, compare, grid, muted, foreground, surface, border, mono: mono || "ui-monospace, monospace" };
  }, [raw]);
}

function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia("(prefers-reduced-motion: reduce)");
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

/** Vertical guide line under the hovered point. */
const crosshair = {
  id: "crosshair",
  afterDatasetsDraw(chart, _args, options) {
    const active = chart.tooltip?.getActiveElements?.() ?? [];
    if (!active.length) return;
    const { ctx, chartArea } = chart;
    const x = active[0].element.x;
    ctx.save();
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * `current` and `compare` are [{ tick, label, value }] — tick for the x axis,
 * label for the tooltip ("3 Oct 2026"), value null where the period has not
 * happened yet (today's line stops at the current hour).
 */
export function MetricLineChart({ current, compare, kind, metricLabel }) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();

  const data = useMemo(() => {
    const count = current.length;
    const compareValues = compare ? compare.slice(0, count).map((point) => point.value) : null;

    return {
      labels: current.map((point) => point.tick),
      datasets: [
        {
          label: "Current",
          data: current.map((point) => point.value),
          borderColor: theme.line,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBorderWidth: 2,
          pointHoverBackgroundColor: theme.surface,
          pointHoverBorderColor: theme.line,
          tension: 0.3,
          cubicInterpolationMode: "monotone",
          fill: "origin",
          spanGaps: false,
          backgroundColor(context) {
            const { ctx, chartArea } = context.chart;
            if (!chartArea || !theme.line) return "transparent";
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, `${theme.line}2e`);
            gradient.addColorStop(1, `${theme.line}00`);
            return gradient;
          },
          order: 1,
        },
        ...(compareValues
          ? [
              {
                label: "Comparison",
                data: compareValues,
                borderColor: theme.compare,
                borderWidth: 2,
                borderDash: [5, 4],
                pointRadius: 0,
                pointHoverRadius: 3,
                pointHoverBackgroundColor: theme.compare,
                pointHoverBorderColor: theme.compare,
                tension: 0.3,
          cubicInterpolationMode: "monotone",
                fill: false,
                order: 2,
              },
            ]
          : []),
      ],
    };
  }, [current, compare, theme]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion ? false : { duration: 300 },
      interaction: { mode: "index", intersect: false },
      layout: { padding: { top: 8, right: 4 } },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: theme.muted,
            font: { family: theme.mono, size: 11 },
            maxRotation: 0,
            autoSkip: true,
            autoSkipPadding: 16,
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: theme.grid, drawTicks: false },
          border: { display: false },
          ticks: {
            color: theme.muted,
            font: { family: theme.mono, size: 11 },
            padding: 8,
            maxTicksLimit: 5,
            callback: (value) => formatMetricCompact(kind, value),
          },
        },
      },
      plugins: {
        crosshair: { color: theme.border },
        tooltip: {
          backgroundColor: theme.surface,
          titleColor: theme.muted,
          bodyColor: theme.foreground,
          borderColor: theme.border,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          boxWidth: 10,
          boxHeight: 2,
          boxPadding: 4,
          titleFont: { size: 12, weight: 500 },
          bodyFont: { family: theme.mono, size: 12 },
          callbacks: {
            title: () => metricLabel,
            label(context) {
              const source = context.datasetIndex === 0 ? current : compare;
              const point = source?.[context.dataIndex];
              return `${point?.label ?? ""}   ${formatMetric(kind, context.parsed.y)}`;
            },
            labelColor(context) {
              const color = context.datasetIndex === 0 ? theme.line : theme.compare;
              return { borderColor: color, backgroundColor: color };
            },
          },
        },
      },
    }),
    [theme, reducedMotion, kind, metricLabel, current, compare]
  );

  if (!theme.line) return <div className="h-full w-full" />;

  return <Line data={data} options={options} plugins={[crosshair]} aria-label={`${metricLabel} chart`} role="img" />;
}
