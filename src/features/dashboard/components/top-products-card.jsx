"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ProductThumb } from "@/features/catalog/components/product-thumb";
import { formatINR, formatNumber } from "@/lib/format";
import { topProducts } from "@/mocks/analytics";

/**
 * Best sellers for the range, ranked. The bar under each title is revenue as
 * a share of the top seller's, so the gap between first and sixth is visible
 * at a glance.
 */
export function TopProductsCard({ world, productById, from, to }) {
  const rows = useMemo(() => topProducts(world, from, to, 6), [world, from, to]);
  const top = Math.max(1, ...rows.map((row) => row.revenue));

  return (
    <Card
      title="Top products"
      subtitle="Best sellers by revenue in this range"
      action={
        <Link href="/products" className="text-13 font-medium text-brand-text hover:underline">
          View all
        </Link>
      }
    >
      {rows.length === 0 ? (
        <p className="px-4 pb-6 pt-4 text-13 text-muted">No paid orders in this range.</p>
      ) : (
        <ol className="mt-2 px-2 pb-2">
          {rows.map((row, index) => (
            <li key={row.productId}>
              <Link
                href={`/products/${row.productId}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-muted"
              >
                <span className="w-4 shrink-0 text-center text-xs font-semibold tabular-nums text-subtle">{index + 1}</span>
                <ProductThumb product={productById.get(row.productId) ?? row} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{row.title}</span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1 w-full max-w-36 overflow-hidden rounded-full bg-neutral-bg" aria-hidden="true">
                      <span className="block h-full rounded-full bg-chart-accent" style={{ width: `${(row.revenue / top) * 100}%` }} />
                    </span>
                    <span className="shrink-0 text-xs text-muted tabular-nums">{formatNumber(row.units)} sold</span>
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatINR(row.revenue)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
