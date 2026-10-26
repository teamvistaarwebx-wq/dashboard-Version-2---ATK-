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

  const figures = [
    ["Visitors right now", live.visitors],
    ["Active carts", live.carts],
    ["Checking out", live.checkout],
    ["Purchased (last 30 min)", live.purchased],
  ];
  const maxCity = Math.max(1, ...live.cities.map(([, count]) => count));

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <span className="live-dot size-2 rounded-full bg-success" aria-hidden="true" />
          Live
        </span>
      }
      action={<span className="text-xs text-muted">Updates every few seconds</span>}
    >
      <dl className="mt-3 grid grid-cols-2 gap-px border-y border-border bg-border">
        {figures.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 bg-surface px-4 py-3">
            <dt className="text-13 text-muted">{label}</dt>
            <dd className="font-mono text-2xl font-semibold tabular-nums">{formatNumber(value)}</dd>
          </div>
        ))}
      </dl>

      <div className="px-4 py-3">
        <p className="text-13 text-muted">Visitors, last 30 minutes</p>
        <Sparkline values={live.history} width={300} height={44} fluid className="mt-2" />
      </div>

      <div className="border-t border-border px-4 pb-4 pt-3">
        <p className="mb-2 text-13 text-muted">Top cities right now</p>
        <ul className="flex flex-col gap-2">
          {live.cities.map(([city, count]) => (
            <li key={city} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-13">
              <span className="truncate">{city}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-neutral-bg" aria-hidden="true">
                <span className="block h-full rounded-full bg-chart-line" style={{ width: `${(count / maxCity) * 100}%` }} />
              </span>
              <span className="text-right font-mono tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
