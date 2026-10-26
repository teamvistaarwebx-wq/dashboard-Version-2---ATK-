import Link from "next/link";
import { formatPrice, formatDateTime } from "@/lib/format";

/**
 * The orders table, split out of the page so it can stream behind a Suspense
 * boundary while the heading and the filter form render immediately.
 *
 * Takes the promise rather than the rows, and shares it with the header's
 * count — one read, two components.
 */
export async function OrdersSection({ ordersPromise }) {
  const { items, page, totalPages } = await ordersPromise;

  if (items.length === 0) {
    return (
      <p className="mt-10 rounded-lg border border-dashed border-gray-300 py-16 text-center text-sm text-gray-500">
        No orders yet.
      </p>
    );
  }

  return (
    <>
      <div className="relative mt-6 overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Placed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/orders/${order.orderNumber}`}
                    className="font-medium text-gray-900 underline-offset-2 hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="block">{order.contact.fullName}</span>
                  <span className="block text-xs text-gray-500">
                    {order.contact.phone}
                  </span>
                </td>
                <td className="px-4 py-3">{order.itemCount}</td>
                <td className="px-4 py-3 font-medium">
                  {formatPrice(order.total)}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={order.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {formatDateTime(order.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <p className="mt-4 text-sm text-gray-500">
          Page {page} of {totalPages}
        </p>
      ) : null}
    </>
  );
}

/** The count beside the heading, off the same promise as the table. */
export async function OrdersCount({ ordersPromise }) {
  const { total } = await ordersPromise;

  return (
    <p className="text-sm text-gray-500">
      {total} {total === 1 ? "order" : "orders"}
    </p>
  );
}

const STATUS_STYLES = {
  pending_payment: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-gray-200 text-gray-700",
  payment_failed: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-500",
  cancelled: "bg-gray-100 text-gray-500",
};

function StatusPill({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
