"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Change } from "@/components/ui/change";
import { formatNumber, percentChange } from "@/lib/format";
import { regionTable } from "@/mocks/analytics";

/**
 * Traffic and corporate enquiries by Indian state for the selected range.
 * The toggle picks which figure ranks the table and gets the share bar; the
 * other sits alongside for context.
 */
const COLLAPSED_ROWS = 8;

export function RegionCard({ world, from, to, comparison, className = "" }) {
  const [measure, setMeasure] = useState("visitors");
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(() => regionTable(world, from, to, comparison), [world, from, to, comparison]);

  const other = measure === "visitors" ? "inquiries" : "visitors";
  const sorted = rows.filter((row) => row[measure] > 0 || row[other] > 0).toSorted((a, b) => b[measure] - a[measure]);
  const total = sorted.reduce((sum, row) => sum + row[measure], 0) || 1;
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_ROWS);

  return (
    <Card
      className={className}
      title="Traffic and inquiries by region"
      subtitle="Indian states, ranked by the selected measure"
      action={
        <Segmented
          label="Rank by"
          size="sm"
          value={measure}
          onChange={setMeasure}
          options={[
            { value: "visitors", label: "Visitors" },
            { value: "inquiries", label: "Inquiries" },
          ]}
        />
      }
    >
      <div className="relative mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-13">
          <thead className="border-y border-border bg-surface-muted/70 text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">State</th>
              <th scope="col" className="px-4 py-2.5 font-medium">{measure}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">{other}</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((row) => {
              const share = row[measure] / total;
              const previous = comparison ? row[`${measure}Prev`] : null;
              return (
                <tr key={row.state}>
                  <th scope="row" className="px-4 py-2.5 font-normal">{row.state}</th>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-12 shrink-0 font-medium tabular-nums">{formatNumber(row[measure])}</span>
                      <span className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-neutral-bg" aria-hidden="true">
                        <span className="block h-full rounded-full bg-chart-line" style={{ width: `${Math.max(2, share * 100)}%` }} />
                      </span>
                      <span className="w-10 shrink-0 text-right text-xs text-muted tabular-nums">
                        {(share * 100).toFixed(share < 0.1 ? 1 : 0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{formatNumber(row[other])}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Change value={previous === null ? null : percentChange(row[measure], previous)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length > COLLAPSED_ROWS ? (
        <div className="border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="text-13 font-medium text-brand-text hover:underline"
          >
            {expanded ? "Show top 8" : `View all ${sorted.length} states`}
          </button>
        </div>
      ) : null}
    </Card>
  );
}
