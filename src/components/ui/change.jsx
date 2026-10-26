import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatPercent } from "@/lib/format";

/**
 * "↗ 12%" in a green pill or "↘ 4.2%" in a red one, against the comparison
 * period. An arrow as well as a colour, so the direction survives colour
 * blindness. Renders a dash when there is nothing to compare against.
 */
export function Change({ value, className = "" }) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className={`text-xs text-muted ${className}`}>—</span>;
  }

  const flat = Math.abs(value) < 0.05;
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={`inline-flex h-5 items-center gap-0.5 rounded-full px-1.5 text-xs font-semibold tabular-nums ${
        flat ? "bg-neutral-bg text-muted" : up ? "bg-success-bg text-success" : "bg-critical-bg text-critical"
      } ${className}`}
    >
      {flat ? null : <Icon className="size-3" strokeWidth={2.5} aria-hidden="true" />}
      <span className="sr-only">{flat ? "No change" : up ? "Up" : "Down"} </span>
      {formatPercent(value)}
    </span>
  );
}
