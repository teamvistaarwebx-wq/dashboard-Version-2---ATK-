import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatPercent } from "@/lib/format";

/**
 * "↗ 12%" in green or "↘ 4.2%" in red, against the comparison period. An
 * arrow as well as a colour, so the direction survives colour blindness.
 * Renders a dash when there is nothing to compare against.
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
      className={`inline-flex items-center gap-0.5 font-mono text-xs font-medium ${
        flat ? "text-muted" : up ? "text-success" : "text-critical"
      } ${className}`}
    >
      {flat ? null : <Icon className="size-3.5" aria-hidden="true" />}
      <span className="sr-only">{flat ? "No change" : up ? "Up" : "Down"} </span>
      {formatPercent(value)}
    </span>
  );
}
