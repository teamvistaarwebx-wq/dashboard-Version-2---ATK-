import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { InventoryTable } from "./inventory-table";
import { buildInventoryHref } from "@/features/inventory/lib/inventory-list-url";
import { STOCK_VIEW } from "@/constants/inventory";

/**
 * The part of /inventory that has to wait for Mongo.
 *
 * Split out so the heading, the History link and the filter chips — none of
 * which need the database — can reach the browser while the stock aggregation
 * is still running. Takes the promise rather than the rows, so the query is
 * already in flight before this component is reached.
 */
export async function InventorySection({ inventoryPromise, q, view }) {
  const { items, total, page, totalPages } = await inventoryPromise;

  const isFiltered = Boolean(q) || view !== STOCK_VIEW.ALL;

  return (
    <>
      {items.length === 0 ? (
        <EmptyState
          title={isFiltered ? "Nothing matches" : "No stock yet"}
          description={
            isFiltered
              ? "Try a different search, or switch back to All stock."
              : "Add a product with opening stock and it will appear here."
          }
        />
      ) : (
        <InventoryTable
          items={items}
          // A function, not a string, because InventoryTable is a server
          // component — the SKU folds into the same filter-preserving URL the
          // pager builds.
          buildAdjustHref={(sku) =>
            buildInventoryHref({ q, view, page, adjust: sku })
          }
        />
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        noun="SKU"
        buildHref={(target) => buildInventoryHref({ q, view, page: target })}
      />
    </>
  );
}
