import { cache } from "react";
import { connectDb } from "@/db/connect";
import { Inventory } from "@/models/inventory.model";
import { Product } from "@/models/product.model";
import { IN_STOCK_FILTER, PRODUCT_STATUS } from "@/constants/enums";

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

/**
 * Catalogue size and how much of it is unsellable right now.
 *
 * "Sold out" is a property of a product, not of an inventory row: a saree with
 * stock in one warehouse and none in another is still sellable. So the
 * aggregation collapses rows to one total per product first, then classifies.
 *
 * Products that track no inventory at all (`trackInventory: false`) are always
 * sellable and never counted as sold out.
 */
export const getCatalogStats = cache(async function getCatalogStats() {
  await connectDb();

  const [totalProducts, buckets] = await Promise.all([
    // The in-stock catalogue only: this card is about what can sell out, and
    // a made-to-order piece never can.
    Product.countDocuments({ isDeleted: false, ...IN_STOCK_FILTER }),

    Inventory.aggregate([
      {
        $group: {
          _id: "$productId",
          available: { $sum: { $subtract: ["$onHand", "$reserved"] } },
          // A threshold set on any row applies to the product — staff set it
          // once and do not expect it to depend on which warehouse answered.
          threshold: { $max: "$lowStockThreshold" },
        },
      },
      // Drop rows whose product has since been deleted or unpublished, so the
      // sold-out count can never exceed the catalogue count.
      {
        $lookup: {
          from: Product.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "product",
          pipeline: [
            {
              $match: {
                isDeleted: false,
                status: PRODUCT_STATUS.ACTIVE,
                trackInventory: true,
              },
            },
            { $project: { _id: 1 } },
          ],
        },
      },
      { $match: { "product.0": { $exists: true } } },
      {
        $group: {
          _id: null,
          soldOut: {
            $sum: { $cond: [{ $lte: ["$available", 0] }, 1, 0] },
          },
          lowStock: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$available", 0] },
                    {
                      $lte: [
                        "$available",
                        {
                          $ifNull: [
                            "$threshold",
                            DEFAULT_LOW_STOCK_THRESHOLD,
                          ],
                        },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const counts = buckets[0] ?? { soldOut: 0, lowStock: 0 };

  return {
    totalProducts,
    soldOut: counts.soldOut,
    lowStock: counts.lowStock,
  };
});
