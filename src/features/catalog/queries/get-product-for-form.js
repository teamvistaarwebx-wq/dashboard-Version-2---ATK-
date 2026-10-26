import mongoose from "mongoose";
import { connectDb } from "@/db/connect";
import { Inventory } from "@/models/inventory.model";
import { Product } from "@/models/product.model";
import { FULFILLMENT } from "@/constants/enums";
import {
  pickColour,
  toRupeeInput,
  withoutColour,
} from "@/features/catalog/lib/product-input";

/**
 * One product, shaped for the edit drawer.
 *
 * Not getProduct(): that is the storefront contract, hard-scoped to published
 * products and stripped of everything admin-only — you could not edit a draft
 * with it, and costPrice and internalNotes would be missing.
 *
 * Prices come back as rupee strings and arrays as plain arrays, so the client
 * component can drop them straight into `defaultValue` without converting
 * anything. Only these fields cross the boundary; the aggregate counters,
 * timestamps and audit ids stay on the server.
 */
const FORM_FIELDS =
  "title slug sku subcategory type tags suggestedOccasions description " +
  "shortDescription details images price compareAtPrice costPrice taxable " +
  "taxClass hsnCode trackInventory allowBackorder lowStockThreshold weight " +
  "isGiftable allowGiftMessage giftWrapAvailable giftBoxCompatible " +
  "internalNotes status fulfillment";

export async function getProductForForm(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  await connectDb();

  // Deleted products are gone as far as the admin is concerned — a stale
  // ?edit= link must not resurrect one.
  const doc = await Product.findOne({ _id: id, isDeleted: false })
    .select(FORM_FIELDS)
    .lean();

  if (!doc) return null;

  /**
   * Read-only on the edit form: it is shown so somebody knows where they
   * stand, with a link to the Inventory screen where a change is logged with a
   * reason. Summed across warehouses, matching how availability is counted
   * everywhere else.
   */
  const [stock] = await Inventory.aggregate([
    { $match: { productId: doc._id } },
    { $group: { _id: null, onHand: { $sum: "$onHand" } } },
  ]);

  return {
    onHand: stock?.onHand ?? 0,
    id: String(doc._id),
    title: doc.title ?? "",
    // Read-only in the drawer. The slug is the product's public web address,
    // so it is shown but never re-editable; the SKU is generated.
    slug: doc.slug ?? "",
    sku: doc.sku ?? "",

    subcategory: doc.subcategory ? String(doc.subcategory) : "",
    type: doc.type ?? "",
    tags: doc.tags ?? [],
    suggestedOccasions: doc.suggestedOccasions ?? [],

    description: doc.description ?? "",
    shortDescription: doc.shortDescription ?? "",
    colour: pickColour(doc.details),
    details: withoutColour(doc.details).map((row) => ({
      label: row.label,
      value: row.value,
    })),

    images: (doc.images ?? [])
      .toSorted((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((image) => ({ url: image.url, alt: image.alt ?? "" })),

    price: toRupeeInput(doc.price),
    compareAtPrice: toRupeeInput(doc.compareAtPrice),
    costPrice: toRupeeInput(doc.costPrice),
    taxable: doc.taxable !== false,
    taxClass: doc.taxClass ?? "",
    hsnCode: doc.hsnCode ?? "",

    trackInventory: doc.trackInventory !== false,
    allowBackorder: Boolean(doc.allowBackorder),
    lowStockThreshold: doc.lowStockThreshold ?? 5,

    // Grams throughout — the unit picker is gone, and nothing reads this yet
    // anyway. It is captured now so a courier integration is not a re-entry
    // job across the whole catalogue.
    weight: doc.weight ?? "",

    isGiftable: doc.isGiftable !== false,
    allowGiftMessage: doc.allowGiftMessage !== false,
    giftWrapAvailable: Boolean(doc.giftWrapAvailable),
    giftBoxCompatible: Boolean(doc.giftBoxCompatible),

    internalNotes: doc.internalNotes ?? "",
    status: doc.status ?? "",
    // Older products have no field at all — they are in stock.
    fulfillment: doc.fulfillment ?? FULFILLMENT.IN_STOCK,
  };
}
