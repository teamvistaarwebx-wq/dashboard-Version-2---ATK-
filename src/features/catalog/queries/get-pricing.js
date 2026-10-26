import mongoose from "mongoose";
import { connectDb } from "@/db/connect";
import { Product } from "@/models/product.model";
import { FULFILLMENT, PRODUCT_STATUS } from "@/constants/enums";

/**
 * Authoritative prices for a set of product ids.
 *
 * Exists so the order path can re-price from the catalog instead of trusting
 * whatever the browser posted. Returns one row per requested id, including
 * ids that are missing or unpurchasable, so the caller can tell the
 * difference between "price changed" and "this product is gone".
 */
export async function getPricing(ids = []) {
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) return [];

  await connectDb();

  const docs = await Product.find({ _id: { $in: validIds } })
    .select("title slug price hasVariants variants.price variants.active status isDeleted fulfillment")
    .lean();

  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));

  return validIds.map((id) => {
    const doc = byId.get(id);

    if (!doc) {
      return { id, found: false, purchasable: false, price: null, title: "" };
    }

    // Made to order is quoted, never bought — see priceBox.
    const purchasable =
      doc.status === PRODUCT_STATUS.ACTIVE &&
      doc.isDeleted !== true &&
      doc.fulfillment !== FULFILLMENT.MADE_TO_ORDER;

    return {
      id,
      found: true,
      purchasable,
      // Variant products price from their cheapest active variant until the
      // cart carries a variant id.
      price: resolvePrice(doc),
      title: doc.title,
      slug: doc.slug,
    };
  });
}

function resolvePrice(doc) {
  if (!doc.hasVariants) return doc.price ?? null;

  let min = Infinity;
  for (const variant of doc.variants ?? []) {
    if (variant.active === false || typeof variant.price !== "number") continue;
    if (variant.price < min) min = variant.price;
  }

  return min === Infinity ? null : min;
}
