import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getMovements,
  getMovementSkus,
} from "@/features/inventory/queries/get-movements";
import { MOVEMENT_REASON, MOVEMENT_REASON_VALUES } from "@/constants/enums";
import { capitalize, formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/dal";
import { Select } from "@/components/ui/select";
import { redirect } from "next/navigation";
import { MOCK_MODE } from "@/lib/mock-mode";

export const metadata = { title: "Stock history | AKT Gifting Admin" };

const REASON_OPTIONS = [
  { value: "", label: "All reasons" },
  ...MOVEMENT_REASON_VALUES.map((value) => ({ value, label: capitalize(value) })),
];

/**
 * Every change to what is on the shelf, newest first.
 *
 * The answer to "where did those four sarees go". Because the ledger only
 * writes a movement when `onHand` actually moves, a SKU's deltas add up to its
 * current figure — if they ever stop adding up, something wrote to Inventory
 * without going through the ledger.
 */
const REASON_STYLES = {
  [MOVEMENT_REASON.SALE]: "bg-blue-100 text-blue-800",
  [MOVEMENT_REASON.RESTOCK]: "bg-emerald-100 text-emerald-800",
  [MOVEMENT_REASON.RETURN]: "bg-emerald-100 text-emerald-800",
  [MOVEMENT_REASON.DAMAGE]: "bg-red-100 text-red-700",
  [MOVEMENT_REASON.ADJUSTMENT]: "bg-amber-100 text-amber-800",
};

export default async function MovementsPage({ searchParams }) {
  // The redesign shows history per product, in a drawer on Inventory.
  if (MOCK_MODE) redirect("/inventory");

  await requireAdmin();

  const params = await searchParams;
  const sku = params?.sku ?? "";
  const reason = params?.reason ?? "";

  // Independent reads — the dropdown never waits on the table.
  const [{ items, total, page, totalPages }, skus] = await Promise.all([
    getMovements({ sku, reason, page: params?.page }),
    getMovementSkus(),
  ]);

  return (
    <>
      <PageHeader
        title="Stock history"
        subtitle="Every change to what is on the shelf, and who made it."
      >
        <Link
          href="/inventory"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:bg-background"
        >
          Back to inventory
        </Link>
      </PageHeader>

      <div className="px-6 py-6 sm:px-8">
        {/* A plain GET form: this page has no live filtering to keep
            responsive, so a client component would buy nothing. */}
        <form action="/inventory/movements" className="flex flex-wrap items-end gap-3">
          {/* Labelled by id, not wrapped: see components/ui/select.jsx. */}
          <div className="flex flex-col gap-1 font-nunito text-xs text-muted">
            <label id="movements-sku-label" htmlFor="movements-sku">
              SKU
            </label>
            <div className="w-56">
              <Select
                id="movements-sku"
                name="sku"
                options={[
                  { value: "", label: "All SKUs" },
                  ...skus.map((value) => ({ value, label: value })),
                ]}
                defaultValue={sku}
                aria-labelledby="movements-sku-label"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 font-nunito text-xs text-muted">
            <label id="movements-reason-label" htmlFor="movements-reason">
              Reason
            </label>
            <div className="w-48">
              <Select
                id="movements-reason"
                name="reason"
                options={REASON_OPTIONS}
                defaultValue={reason}
                aria-labelledby="movements-reason-label"
              />
            </div>
          </div>

          <button
            type="submit"
            className="h-11 rounded-lg bg-brand px-4 font-nunito text-sm font-semibold text-white transition hover:bg-brand/90"
          >
            Filter
          </button>
        </form>

        {items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={sku || reason ? "No matching movements" : "Nothing has moved yet"}
              description={
                sku || reason
                  ? "Try a different SKU or reason."
                  : "Stock changes appear here as soon as anything is sold, restocked or adjusted."
              }
            />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-3xl text-left text-sm">
              <thead className="border-b border-border bg-background font-nunito text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">When</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Product</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Change</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Reason</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Note</th>
                  <th scope="col" className="px-4 py-3 font-semibold">By</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {items.map((row) => (
                  <tr key={row.id} className="transition hover:bg-background">
                    <td className="whitespace-nowrap px-4 py-3 font-nunito text-muted">
                      {formatDateTime(row.at)}
                    </td>

                    <td className="px-4 py-3">
                      <span className="block text-foreground">{row.title}</span>
                      <span className="block font-nunito text-xs text-muted">
                        {row.sku}
                      </span>
                    </td>

                    <td
                      className={`px-4 py-3 text-right font-semibold tabular-nums ${
                        row.delta > 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {row.delta > 0 ? `+${row.delta}` : row.delta}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 font-nunito text-xs font-medium capitalize ${
                          REASON_STYLES[row.reason] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {row.reason}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-nunito text-xs text-muted">
                      {row.orderRef ? (
                        <Link
                          href={`/orders/${row.orderRef}`}
                          className="text-brand underline-offset-2 hover:underline"
                        >
                          View order
                        </Link>
                      ) : null}
                      {row.note ? (
                        <span className="block">{row.note}</span>
                      ) : null}
                      {!row.orderRef && !row.note ? "—" : null}
                    </td>

                    <td className="px-4 py-3 font-nunito text-xs text-muted">
                      {/* Blank when the system did it to itself — a paid
                          webhook has no person behind it. */}
                      {row.actor || "System"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <p className="mt-4 font-nunito text-sm text-muted">
            Page {page} of {totalPages} · {total} movements
          </p>
        ) : null}
      </div>
    </>
  );
}
