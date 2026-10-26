import { formatINR, formatINRCompact, formatNumber } from "@/lib/format";

/** Full figure for a metric value: "₹1,24,500", "1,240", "2.14%". */
export function formatMetric(kind, value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (kind === "inr") return formatINR(value);
  if (kind === "percent") return `${value.toFixed(2)}%`;
  return formatNumber(Math.round(value));
}

/** Axis-label version: "₹1.2L", "1.2K", "2%". */
export function formatMetricCompact(kind, value) {
  if (!Number.isFinite(value)) return "";
  if (kind === "inr") return formatINRCompact(value);
  if (kind === "percent") return `${Number(value.toFixed(1))}%`;
  if (value >= 1000) return `${Number((value / 1000).toFixed(1))}K`;
  return String(Math.round(value));
}
