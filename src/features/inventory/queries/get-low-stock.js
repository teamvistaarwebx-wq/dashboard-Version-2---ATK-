import { cache } from "react";
import { connectDb } from "@/db/connect";
import { Inventory } from "@/models/inventory.model";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/constants/inventory";

const MAX_ROWS = 6;

/**
 * What needs restocking, for the dashboard.
 *
 * Oversold rows sort first and are counted separately: "available: -1" is not
 * a restocking job, it is somebody who has paid for something we do not have,
 * and it needs a phone call today rather than a purchase order this week.
 *
 * cache()d because the dashboard renders it once but the KPI row may ask for
 * the same figures in the same request.
 */
export const getLowStock = cache(async function getLowStock() {
  await connectDb();

  const rows = await Inventory.aggregate([
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
        pipeline: [
          { $project: { title: 1, isDeleted: 1, lowStockThreshold: 1 } },
        ],
      },
    },
    { $set: { product: { $first: "$product" } } },
    { $match: { "product.isDeleted": { $ne: true } } },
    {
      $set: {
        available: { $subtract: ["$onHand", "$reserved"] },
        threshold: {
          $ifNull: [
            "$lowStockThreshold",
            {
              $ifNull: [
                "$product.lowStockThreshold",
                DEFAULT_LOW_STOCK_THRESHOLD,
              ],
            },
          ],
        },
      },
    },
    { $match: { $expr: { $lte: ["$available", "$threshold"] } } },
    { $sort: { available: 1, sku: 1 } },
    {
      $facet: {
        rows: [
          { $limit: MAX_ROWS },
          {
            $project: {
              sku: 1,
              available: 1,
              threshold: 1,
              "product.title": 1,
            },
          },
        ],
        totals: [
          {
            $group: {
              _id: null,
              low: { $sum: 1 },
              oversold: {
                $sum: { $cond: [{ $lt: ["$available", 0] }, 1, 0] },
              },
            },
          },
        ],
      },
    },
  ]);

  const [result] = rows;
  const totals = result?.totals?.[0] ?? { low: 0, oversold: 0 };

  return {
    items: (result?.rows ?? []).map((row) => ({
      id: String(row._id),
      sku: row.sku,
      title: row.product?.title ?? "—",
      available: row.available ?? 0,
      threshold: row.threshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
    })),
    lowCount: totals.low,
    oversoldCount: totals.oversold,
  };
});
