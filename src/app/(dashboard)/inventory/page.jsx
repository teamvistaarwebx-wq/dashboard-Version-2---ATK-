import { Suspense } from "react";
import Link from "next/link";
import { History, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/ui/skeleton";
import { AdjustStockDrawer } from "@/features/inventory/components/adjust-stock-drawer";
import { InventoryFilters } from "@/features/inventory/components/inventory-filters";
import { InventorySection } from "@/features/inventory/components/inventory-section";
import {
  getInventory,
  getInventoryRow,
} from "@/features/inventory/queries/get-inventory";
import { normalizeStockView } from "@/constants/inventory";
import { requireAdmin } from "@/lib/auth/dal";
import { InventoryScreen } from "@/features/inventory/components/inventory-screen";
import { MOCK_MODE } from "@/lib/mock-mode";

export const metadata = { title: "Inventory | AKT Gifting Admin" };

/** Built on the server so lucide-react stays out of the client bundle. */
const SEARCH_ICON = <Search className="h-4 w-4" strokeWidth={2} />;

/**
 * Stock on hand.
 *
 * Nothing is awaited here. The filter bar needs no data at all, so it renders
 * immediately alongside the header, and the table streams in behind it — where
 * this page used to hold the entire screen, sticky bar included, until an
 * aggregation over every product had finished.
 */
export default async function InventoryPage({ searchParams }) {
  if (MOCK_MODE) {
    return (
      <Suspense>
        <InventoryScreen />
      </Suspense>
    );
  }

  await requireAdmin();

  const params = await searchParams;
  const q = params?.q ?? "";
  const view = normalizeStockView(params?.view);
  // The SKU being adjusted. A SKU, not an Inventory row id, because a product
  // that has never been counted has no row to point at — and that is exactly
  // the product somebody is here to fix.
  const adjustSku = params?.adjust ?? "";

  // Started, not awaited — in flight while the header renders above it.
  const inventoryPromise = getInventory({ q, view, page: params?.page });

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="What is on the shelf, what is held for unpaid orders, and what can still be sold."
      >
        <Link
          href="/inventory/movements"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:bg-background"
        >
          <History className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          History
        </Link>
      </PageHeader>

      <div className="px-6 py-6 sm:px-8">
        {/* No "never stocked" banner any more: the table is built from
            products, so an uncounted SKU is simply a row reading 0 with its
            own Adjust button. Nothing is hidden, so nothing needs announcing. */}
        <InventoryFilters q={q} view={view} searchIcon={SEARCH_ICON}>
          {/* Only the table waits. The chips above it are already interactive,
              so a second filter can be applied while the first is still
              loading. */}
          <Suspense fallback={<TableSkeleton rows={8} columns={5} />}>
            <InventorySection
              inventoryPromise={inventoryPromise}
              q={q}
              view={view}
            />
          </Suspense>
        </InventoryFilters>
      </div>

      {adjustSku ? (
        <Suspense fallback={null}>
          <AdjustStockSection sku={adjustSku} />
        </Suspense>
      ) : null}
    </>
  );
}

/**
 * The adjust drawer's one read, behind its own boundary so opening it never
 * stalls the table underneath.
 */
async function AdjustStockSection({ sku }) {
  const row = await getInventoryRow(sku);

  // A stale ?adjust= for a SKU that has since gone resolves to null — showing
  // an empty drawer would be worse than showing nothing.
  if (!row) return null;

  return <AdjustStockDrawer row={row} />;
}
