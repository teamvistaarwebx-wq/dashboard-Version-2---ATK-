"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { formatNumber } from "@/lib/format";
import { initialLive, stepLive } from "@/mocks/live";

const TICK_MS = 4000;

/**
 * Who is on the storefront right now. The first frame is seeded from the
 * hour's traffic; then every few seconds each figure takes a small random
 * step. The numbers are announced politely, not on every tick — a screen
 * reader re-reading four counters every four seconds would be unbearable.
 */
export function LiveViewCard({ world }) {
  const [live, setLive] = useState(() => initialLive(world));

  useEffect(() => {
    const timer = setInterval(() => setLive(stepLive), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // Each funnel step as a share of everyone on the site right now.
  const funnel = [
    ["Active carts", live.carts],
    ["Checking out", live.checkout],
    ["Purchased (last 30 min)", live.purchased],
  ];
  const base = Math.max(1, live.visitors);
  const maxCity = Math.max(1, ...live.cities.map(([, count]) => count));

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <span className="live-dot size-2 rounded-full bg-success" aria-hidden="true" />
          Live
        </span>
      }
      subtitle="Storefront activity, updates every few seconds"
    >
      <div className="px-4 pt-4">
        <p className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold leading-none tracking-tight tabular-nums">{formatNumber(live.visitors)}</span>
          <span className="text-13 text-muted">visitors right now</span>
        </p>
        <Sparkline values={live.history} width={300} height={40} fluid className="mt-3" />
        <p className="mt-1 text-xs text-subtle">Visitors, last 30 minutes</p>
      </div>

      <dl className="mx-4 mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface-muted/60 p-3.5">
        {funnel.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3 text-13">
              <dt className="text-muted">{label}</dt>
              <dd className="font-semibold tabular-nums">{formatNumber(value)}</dd>
            </div>
            <span className="h-1.5 overflow-hidden rounded-full bg-neutral-bg" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-brand"
                style={{ width: `${Math.max(3, Math.min(100, (value / base) * 100))}%` }}
              />
            </span>
          </div>
        ))}
      </dl>

      <div className="px-4 pb-4 pt-4">
        <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-muted">Top cities right now</p>
        <ul className="flex flex-col gap-2">
          {live.cities.map(([city, count]) => (
            <li key={city} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-13">
              <span className="truncate">{city}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-neutral-bg" aria-hidden="true">
                <span className="block h-full rounded-full bg-chart-line/70" style={{ width: `${(count / maxCity) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums text-muted">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
