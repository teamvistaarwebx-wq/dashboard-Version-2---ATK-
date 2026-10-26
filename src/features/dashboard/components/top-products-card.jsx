"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ProductThumb } from "@/features/catalog/components/product-thumb";
import { formatINR, formatNumber } from "@/lib/format";
import { topProducts } from "@/mocks/analytics";

export function TopProductsCard({ world, productById, from, to }) {
  const rows = useMemo(() => topProducts(world, from, to, 6), [world, from, to]);

  return (
    <Card
      title="Top products by sales"
      action={
        <Link href="/products" className="text-13 font-medium text-brand-text hover:underline">
          View all
        </Link>
      }
    >
      {rows.length === 0 ? (
        <p className="px-4 pb-6 pt-4 text-13 text-muted">No paid orders in this range.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {rows.map((row) => (
            <li key={row.productId}>
              <Link href={`/products/${row.productId}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-muted">
                <ProductThumb product={productById.get(row.productId) ?? row} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{row.title}</span>
                  <span className="block font-mono text-xs text-muted">{formatNumber(row.units)} sold</span>
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums">{formatINR(row.revenue)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
