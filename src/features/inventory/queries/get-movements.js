import { connectDb } from "@/db/connect";
import { StockMovement } from "@/models/stock-movement.model";
/**
 * Side-effect imports: the two `.populate()` calls below resolve their `ref`
 * through Mongoose's registry by name, so both models have to have been
 * imported somewhere for this query to work at all.
 */
import "@/models/product.model";
import "@/models/admin-user.model";
import { MOVEMENT_REASON_VALUES } from "@/constants/enums";
import { PAGE_SIZE, normalizePage } from "@/constants/catalog-query";

/**
 * The audit trail — every change to onHand, newest first.
 *
 * This is the answer to "where did those four sarees go". Because the ledger
 * only ever writes a movement when onHand moves, the deltas for a SKU sum to
 * its current onHand; a mismatch means something wrote to Inventory without
 * coming through the ledger.
 */
export async function getMovements({ sku = "", reason = "", page } = {}) {
  await connectDb();

  const currentPage = normalizePage(page);

  const filter = {};
  if (sku) filter.sku = sku;
  if (MOVEMENT_REASON_VALUES.includes(reason)) filter.reason = reason;

  // Independent reads — the page and its count never wait on each other.
  const [rows, total] = await Promise.all([
    StockMovement.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((currentPage - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate({ path: "productId", select: "title" })
      .populate({ path: "actor", select: "fullName email" })
      .select("sku delta reason note refType refId createdAt productId actor")
      .lean(),
    StockMovement.countDocuments(filter),
  ]);

  return {
    items: rows.map((row) => ({
      id: String(row._id),
      sku: row.sku,
      title: row.productId?.title ?? "—",
      delta: row.delta,
      reason: row.reason,
      note: row.note ?? "",
      // Only orders carry a reference today, and the id is what links a
      // movement back to the order that caused it.
      orderRef: row.refType === "order" ? String(row.refId) : "",
      // Empty for anything the system did to itself, like a paid webhook.
      actor: row.actor?.fullName || row.actor?.email || "",
      at: row.createdAt,
    })),
    page: currentPage,
    total,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

/** The distinct SKUs that have ever moved, for the filter dropdown. */
export async function getMovementSkus() {
  await connectDb();
  return StockMovement.distinct("sku").then((rows) => rows.filter(Boolean).sort());
}
