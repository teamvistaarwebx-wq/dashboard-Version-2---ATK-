import Link from "next/link";
import { History, SlidersHorizontal } from "lucide-react";
import { AvailabilityPill } from "./availability-pill";

/**
 * Every stocked SKU, worst first.
 *
 * Three numbers rather than one, because they answer different questions:
 * `on hand` is what is physically in the room, `held` is what is spoken for by
 * an unpaid checkout, and `available` is what can still be sold. Showing only
 * availability would leave staff unable to explain why a shelf with four
 * sarees on it will not sell a fourth.
 */
const ADJUST_ICON = <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />;
const HISTORY_ICON = <History className="h-4 w-4" strokeWidth={2} />;

export function InventoryTable({ items, buildAdjustHref }) {
  return (
    <div className="relative overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-3xl text-left text-sm">
        <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Product</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">On hand</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Held</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Available</th>
            <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {items.map((row) => (
            <tr key={row.id} className="transition hover:bg-surface-muted">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted">
                    {row.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.imageUrl}
                        alt=""
                        width={40}
                        height={40}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {row.title}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {row.sku}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3 text-right tabular-nums text-foreground">
                {row.onHand}
              </td>

              <td className="px-4 py-3 text-right tabular-nums text-muted">
                {/* A dash reads better than a 0 in a column that is usually
                    empty — it says "nothing to see", not "a measured zero". */}
                {row.reserved > 0 ? row.reserved : "—"}
              </td>

              <td
                className={`px-4 py-3 text-right font-semibold tabular-nums ${
                  row.available < 0 ? "text-danger" : "text-foreground"
                }`}
              >
                {row.available}
              </td>

              <td className="px-4 py-3">
                <AvailabilityPill
                  available={row.available}
                  threshold={row.threshold}
                  allowBackorder={row.allowBackorder}
                  hasStockRecord={row.hasStockRecord}
                />
              </td>

              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/inventory/movements?sku=${encodeURIComponent(row.sku)}`}
                    aria-label={`History for ${row.sku}`}
                    className="rounded-md p-2 text-muted transition hover:bg-surface-muted hover:text-brand"
                  >
                    {HISTORY_ICON}
                  </Link>

                  <Link
                    href={buildAdjustHref(row.id)}
                    aria-label={`Adjust stock for ${row.sku}`}
                    className="rounded-md p-2 text-brand transition hover:bg-brand-soft"
                  >
                    {ADJUST_ICON}
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
