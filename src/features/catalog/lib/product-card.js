import { Category } from "@/models/category.model";
import { Inventory } from "@/models/inventory.model";
import { FULFILLMENT } from "@/constants/enums";

/**
 * The card contract shared by every list-shaped endpoint (listing grid,
 * related products). Kept in one place so a change to what a card renders
 * cannot drift between them.
 */

/** Only these fields ever leave the DB for a card — never the full doc. */
export const CARD_FIELDS =
  "slug title sku price compareAtPrice currency images hasVariants " +
  "variants.sku variants.price variants.active isGiftable allowBackorder " +
  "trackInventory category fulfillment shortDescription";

/**
 * One extra indexed read for the page's SKUs, summed across warehouses.
 * Availability is never denormalized onto Product (see models/README.md).
 */
export async function getAvailability(docs) {
  const skus = [];
  for (const doc of docs) {
    if (doc.hasVariants) {
      for (const variant of doc.variants ?? []) {
        if (variant.active !== false && variant.sku) skus.push(variant.sku);
      }
    } else if (doc.sku) {
      skus.push(doc.sku);
    }
  }

  if (skus.length === 0) return new Map();

  const rows = await Inventory.find({ sku: { $in: skus } })
    .select("sku onHand reserved")
    .lean();

  const bySku = new Map();
  for (const row of rows) {
    const available = Math.max(0, (row.onHand || 0) - (row.reserved || 0));
    bySku.set(row.sku, (bySku.get(row.sku) ?? 0) + available);
  }

  return bySku;
}

/**
 * One indexed read for the page's categories, mapped id → slug.
 *
 * A lookup rather than `.populate("category")`: both recommendation queries
 * rank by comparing raw category ObjectIds (`String(source.category) ===
 * String(candidate.category)`), and a populated document stringifies to
 * "[object Object]" — every comparison would match and the ranking would
 * silently collapse. Categories are a handful of rows, so this stays cheap.
 */
export async function getCategorySlugs(docs) {
  const ids = [];
  for (const doc of docs) {
    if (doc.category) ids.push(doc.category);
  }

  if (ids.length === 0) return new Map();

  const rows = await Category.find({ _id: { $in: ids } })
    .select("slug")
    .lean();

  return new Map(rows.map((row) => [String(row._id), row.slug]));
}

export function toCard(doc, availability, categorySlugs) {
  const { price, priceVaries } = resolvePrice(doc);

  return {
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    price,
    priceVaries,
    compareAtPrice: doc.compareAtPrice ?? null,
    currency: doc.currency || "INR",
    image: pickFeaturedImage(doc.images),
    available: isAvailable(doc, availability),
    isGiftable: doc.isGiftable !== false,
    /**
     * The slug ("women" / "men"), not the id — the storefront charges the
     * corporate gift-box quota against it, and an ObjectId would mean
     * nothing there. Null when the lookup was skipped.
     */
    category: categorySlugs?.get(String(doc.category)) ?? null,
    /** Older products have no field — they are in stock. */
    fulfillment: doc.fulfillment ?? FULFILLMENT.IN_STOCK,
    /** The one-line blurb a made-to-order card shows under its title. */
    shortDescription: doc.shortDescription ?? "",
  };
}

export function resolvePrice(doc) {
  if (!doc.hasVariants) {
    return { price: doc.price ?? 0, priceVaries: false };
  }

  let min = Infinity;
  let max = -Infinity;
  for (const variant of doc.variants ?? []) {
    if (variant.active === false || typeof variant.price !== "number") continue;
    if (variant.price < min) min = variant.price;
    if (variant.price > max) max = variant.price;
  }

  if (min === Infinity) return { price: 0, priceVaries: false };
  return { price: min, priceVaries: min !== max };
}

export function pickFeaturedImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  const featured = images.find((img) => img.isFeatured) ?? images[0];
  return { url: featured.url, alt: featured.alt || "" };
}

export function isAvailable(doc, availability) {
  // Woven on request, so it never runs out.
  if (doc.fulfillment === FULFILLMENT.MADE_TO_ORDER) return true;
  if (doc.trackInventory === false || doc.allowBackorder) return true;

  if (doc.hasVariants) {
    return (doc.variants ?? []).some(
      (variant) =>
        variant.active !== false && (availability.get(variant.sku) ?? 0) > 0
    );
  }

  return (availability.get(doc.sku) ?? 0) > 0;
}
