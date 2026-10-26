import { cache } from "react";
import { connectDb } from "@/db/connect";
import { Inventory } from "@/models/inventory.model";
import { Product } from "@/models/product.model";
import { Subcategory } from "@/models/subcategory.model";
/** Side-effect import: `.populate("category")` needs it in the registry. */
import "@/models/category.model";
import { IN_STOCK_FILTER, PRODUCT_STATUS } from "@/constants/enums";

const MAX_ROWS = 8;

/**
 * "3/4 in stock" per subcategory — Saree, Dupatta, Jewellery and the rest.
 *
 * Grouped by subcategory rather than category: "Women 12/14" tells staff
 * nothing they can act on, whereas "Saree 1/4" sends them to a supplier.
 *
 * Driven from Product, not Inventory, so a product with no inventory row at
 * all still counts against its subcategory's total instead of vanishing.
 */
export const getStockByCategory = cache(async function getStockByCategory() {
  await connectDb();

  const [products, inventory, subcategories] = await Promise.all([
    Product.find({
      isDeleted: false,
      status: PRODUCT_STATUS.ACTIVE,
      subcategory: { $ne: null },
      // Made-to-order pieces have no stock; counting them as "in stock" would
      // make a sold-out subcategory look healthy.
      ...IN_STOCK_FILTER,
    })
      .select("subcategory trackInventory")
      .lean(),

    Inventory.aggregate([
      {
        $group: {
          _id: "$productId",
          available: { $sum: { $subtract: ["$onHand", "$reserved"] } },
        },
      },
    ]),

    Subcategory.find({ isActive: true })
      .sort({ order: 1 })
      .select("name category")
      .populate({ path: "category", select: "name" })
      .lean(),
  ]);

  // Both maps are built once and read once per product. Scanning the arrays
  // inside the loop instead would make this quadratic in catalogue size.
  const availableByProduct = new Map(
    inventory.map((row) => [String(row._id), row.available])
  );

  // Insertion order is the sorted order, which is also the display order —
  // so the rows come out sorted without a second pass.
  const rows = new Map(
    subcategories.map((sub) => [
      String(sub._id),
      {
        id: String(sub._id),
        name: sub.name,
        categoryName: sub.category?.name ?? "",
        inStock: 0,
        total: 0,
      },
    ])
  );

  for (const product of products) {
    const row = rows.get(String(product.subcategory));
    // Inactive or deleted subcategory — nowhere to show it.
    if (!row) continue;

    row.total += 1;

    // Untracked products are always sellable: there is no count to run out.
    const inStock = product.trackInventory
      ? (availableByProduct.get(String(product._id)) ?? 0) > 0
      : true;

    if (inStock) row.inStock += 1;
  }

  // Empty subcategories are noise on a dashboard, not information.
  const withStock = [...rows.values()]
    .filter((row) => row.total > 0)
    .slice(0, MAX_ROWS);

  // Women and Men both have "Other Collection". Qualify a name only when it
  // appears twice, so Saree stays Saree.
  const nameCounts = new Map();
  for (const row of withStock) {
    nameCounts.set(row.name, (nameCounts.get(row.name) ?? 0) + 1);
  }

  return withStock.map((row) => ({
    id: row.id,
    name:
      nameCounts.get(row.name) > 1 && row.categoryName
        ? `${row.name} · ${row.categoryName}`
        : row.name,
    inStock: row.inStock,
    total: row.total,
  }));
});
