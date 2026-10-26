import { connectDb } from "@/db/connect";
import { Product } from "@/models/product.model";
import { PAGE_SIZE, normalizePage } from "@/constants/catalog-query";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  STOCK_VIEW,
  normalizeStockView,
} from "@/constants/inventory";
import { resolveImageUrl } from "@/lib/storefront";

/**
 * The inventory table.
 *
 * Driven from Product, NOT from Inventory. That is the whole point: a product
 * nobody has ever counted has no Inventory row, so a list built from Inventory
 * could not show it — and the only way to create that row is the Adjust button
 * that would have been on the row that does not exist. The key was locked
 * inside the room.
 *
 * Starting from Product means every tracked SKU has a line, stocked or not,
 * and "never counted" is simply `0 on hand`. `adjustStock` already upserts the
 * row on a positive change, so saving from that line creates it.
 *
 * `available` is computed every time, never stored — the same rule as
 * getAvailability() in features/catalog/lib/product-card.js, and the two must
 * agree or one of them is selling stock that is not there.
 */

const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

/**
 * Summed across warehouses, matching how availability is counted everywhere
 * else. There is one warehouse today; this does not have to change when there
 * are two.
 */
const STOCK_TOTALS = {
  onHand: { $sum: "$stock.onHand" },
  reserved: { $sum: "$stock.reserved" },
  // Null until the row exists. adjustStock falls back to the default
  // warehouse, which is exactly what a first count should use.
  warehouseId: { $first: "$stock.warehouse" },
  hasStockRecord: { $gt: [{ $size: "$stock" }, 0] },
  // The row's threshold is a per-warehouse override; the product's is the rule.
  threshold: {
    $ifNull: [
      { $first: "$stock.lowStockThreshold" },
      { $ifNull: ["$lowStockThreshold", DEFAULT_LOW_STOCK_THRESHOLD] },
    ],
  },
};

const STOCK_LOOKUP = {
  $lookup: {
    from: "inventories",
    localField: "_id",
    foreignField: "productId",
    as: "stock",
    pipeline: [
      { $project: { _id: 0, onHand: 1, reserved: 1, warehouse: 1, lowStockThreshold: 1 } },
    ],
  },
};

/**
 * Only what can actually hold stock. An untracked product has no count to
 * manage, and a product with no SKU has nothing to count against.
 */
const STOCKABLE = {
  isDeleted: false,
  trackInventory: true,
  sku: { $nin: ["", null] },
};

export async function getInventory({ q = "", view = "", page } = {}) {
  await connectDb();

  const currentPage = normalizePage(page);
  const stockView = normalizeStockView(view);

  const match = { ...STOCKABLE };

  const term = String(q).trim();
  if (term) {
    const search = new RegExp(term.replace(REGEX_SPECIALS, "\\$&"), "i");
    match.$or = [{ sku: search }, { title: search }];
  }

  const pipeline = [
    { $match: match },
    STOCK_LOOKUP,
    { $set: STOCK_TOTALS },
    { $set: { available: { $subtract: ["$onHand", "$reserved"] } } },
  ];

  // Applied after `available` exists — none of these can be expressed against
  // the stored fields alone.
  const viewMatch = {
    [STOCK_VIEW.OVERSOLD]: { available: { $lt: 0 } },
    [STOCK_VIEW.OUT]: { available: { $lte: 0 } },
    [STOCK_VIEW.LOW]: { $expr: { $lte: ["$available", "$threshold"] } },
  }[stockView];

  if (viewMatch) pipeline.push({ $match: viewMatch });

  pipeline.push(
    // Worst first — nobody opens this page to admire the well-stocked rows.
    { $sort: { available: 1, sku: 1 } },
    {
      $facet: {
        rows: [
          { $skip: (currentPage - 1) * PAGE_SIZE },
          { $limit: PAGE_SIZE },
          {
            $project: {
              sku: 1,
              title: 1,
              allowBackorder: 1,
              onHand: 1,
              reserved: 1,
              available: 1,
              threshold: 1,
              hasStockRecord: 1,
              warehouseId: 1,
              images: { $slice: ["$images", 1] },
            },
          },
        ],
        count: [{ $count: "value" }],
      },
    }
  );

  const [result] = await Product.aggregate(pipeline);
  const total = result?.count?.[0]?.value ?? 0;

  return {
    items: (result?.rows ?? []).map(toRow),
    page: currentPage,
    total,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

/**
 * One line, for the adjust drawer.
 *
 * Addressed by SKU rather than by an Inventory row id, because the whole point
 * is that the row may not exist yet. The SKU is unique across the catalogue
 * (a partial unique index enforces it) and is the thing stock is counted
 * against, so it is the stable handle here.
 */
export async function getInventoryRow(sku) {
  const value = String(sku ?? "").trim();
  if (!value) return null;

  await connectDb();

  const [row] = await Product.aggregate([
    { $match: { ...STOCKABLE, sku: value } },
    STOCK_LOOKUP,
    { $set: STOCK_TOTALS },
    { $set: { available: { $subtract: ["$onHand", "$reserved"] } } },
    { $set: { images: { $slice: ["$images", 1] } } },
  ]);

  return row ? toRow(row) : null;
}

function toRow(doc) {
  return {
    // The SKU is the row's identity now, not an Inventory _id — an unstocked
    // product has no _id to be addressed by.
    id: doc.sku,
    productId: String(doc._id),
    // Empty until the first count; adjustStock resolves the default warehouse.
    warehouseId: doc.warehouseId ? String(doc.warehouseId) : "",
    sku: doc.sku,
    title: doc.title ?? "—",
    onHand: doc.onHand ?? 0,
    reserved: doc.reserved ?? 0,
    available: doc.available ?? 0,
    threshold: doc.threshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
    allowBackorder: Boolean(doc.allowBackorder),
    /**
     * Never counted, as opposed to counted and gone. Both read zero, but one
     * is an oversight and the other is a sales problem.
     */
    hasStockRecord: Boolean(doc.hasStockRecord),
    imageUrl: resolveImageUrl(doc.images?.[0]?.url),
  };
}
