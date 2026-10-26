import { Suspense } from "react";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import {
  OrdersCount,
  OrdersSection,
} from "@/features/orders/components/orders-section";
import { getOrders } from "@/features/orders/queries/get-orders";
import { Select } from "@/components/ui/select";
import { ORDER_STATUS_VALUES } from "@/constants/enums";
import { capitalize } from "@/lib/format";
import { OrdersScreen } from "@/features/orders/components/orders-screen";
import { MOCK_MODE } from "@/lib/mock-mode";

export const metadata = { title: "Orders | AKT Gifting Admin" };

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  ...ORDER_STATUS_VALUES.map((value) => ({ value, label: capitalize(value) })),
];

/**
 * Orders list.
 *
 * Calls the query directly rather than its own HTTP API — it runs inside the
 * app that owns the model, so a network round trip would buy nothing.
 *
 * The query is started here and awaited nowhere: the heading and the filter
 * form need nothing from Mongo, so they render immediately while the table and
 * the count stream in off the one shared promise.
 */
export default async function OrdersPage({ searchParams }) {
  if (MOCK_MODE) {
    return (
      <Suspense>
        <OrdersScreen />
      </Suspense>
    );
  }

  const params = await searchParams;
  const status = params?.status ?? "";
  const q = params?.q ?? "";

  const ordersPromise = getOrders({ status, q, page: params?.page });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <Suspense fallback={<Skeleton className="h-4 w-24" />}>
          <OrdersCount ordersPromise={ordersPromise} />
        </Suspense>
      </header>

      <form className="mt-6 flex flex-wrap items-end gap-3" action="/orders">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Search
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Order number, phone or email"
            className="w-72 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          />
        </label>

        {/* Labelled by id, not wrapped: see components/ui/select.jsx. */}
        <div className="flex flex-col gap-1 text-xs text-gray-600">
          <label id="orders-status-label" htmlFor="orders-status">
            Status
          </label>
          <div className="w-52">
            <Select
              id="orders-status"
              name="status"
              options={STATUS_OPTIONS}
              defaultValue={status}
              aria-labelledby="orders-status-label"
              size="sm"
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white transition hover:bg-gray-700"
        >
          Filter
        </button>
      </form>

      <Suspense
        fallback={
          <div className="mt-6">
            <TableSkeleton rows={8} columns={6} />
          </div>
        }
      >
        <OrdersSection ordersPromise={ordersPromise} />
      </Suspense>
    </main>
  );
}
