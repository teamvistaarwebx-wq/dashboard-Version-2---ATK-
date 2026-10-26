import mongoose from "mongoose";
import { connectDb } from "@/db/connect";
import { Inventory } from "@/models/inventory.model";
import { Product } from "@/models/product.model";
/**
 * Imported for the side effect only. `.populate("category")` below resolves
 * the `ref` through Mongoose's model registry by name, and a model file that
 * was never imported has not registered itself — so dropping these two lines
 * turns the populate into a MissingSchemaError at runtime, not at build.
 */
import "@/models/category.model";
import "@/models/subcategory.model";
import { FULFILLMENT, PRODUCT_STATUS } from "@/constants/enums";

/**
 * Fields a product detail page renders. Deliberately excludes admin-only
 * data — costPrice, internalNotes, createdBy/updatedBy, views, salesCount
 * must never reach a public response.
 */
const DETAIL_FIELDS =
  "slug title sku vendor type tags description shortDescription details " +
  "images videos price compareAtPrice currency taxable taxClass " +
  "hasVariants options variants isGiftable allowGiftMessage " +
  "giftWrapAvailable giftBoxCompatible trackInventory allowBackorder " +
  "weight weightUnit dimensions seo suggestedOccasions suggestedRecipient " +
  "ratingAverage ratingCount category subcategory publishedAt fulfillment";

/**
 * A single published product, by slug or by id.
 *
 * The storefront routes on slug (/products/[slug]); admin previews may pass
 * an ObjectId. Returns null when nothing matches, so the caller can 404.
 */
export async function getProduct(idOrSlug) {
  if (!idOrSlug) return null;

  await connectDb();

  const filter = {
    status: PRODUCT_STATUS.ACTIVE,
    isDeleted: false,
  };

  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    filter._id = idOrSlug;
  } else {
    filter.slug = String(idOrSlug).toLowerCase();
  }

  const doc = await Product.find(filter)
    .select(DETAIL_FIELDS)
    .populate("category", "name slug")
    .populate("subcategory", "name slug")
    .limit(1)
    .lean()
    .then((rows) => rows[0]);

  if (!doc) return null;

  // Nothing to count for a piece woven on request — skip the stock read.
  const availability =
    doc.fulfillment === FULFILLMENT.MADE_TO_ORDER
      ? new Map()
      : await getAvailability(doc);

  return toDetail(doc, availability);
}

async function getAvailability(doc) {
  const skus = doc.hasVariants
    ? (doc.variants ?? [])
        .filter((variant) => variant.active !== false && variant.sku)
        .map((variant) => variant.sku)
    : [doc.sku].filter(Boolean);

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

function toDetail(doc, availability) {
  const fulfillment = doc.fulfillment ?? FULFILLMENT.IN_STOCK;
  const unlimited =
    fulfillment === FULFILLMENT.MADE_TO_ORDER ||
    doc.trackInventory === false ||
    doc.allowBackorder;
  const stock = unlimited ? null : availability.get(doc.sku) ?? 0;

  return {
    id: String(doc._id),
    slug: doc.slug,
    /**
     * Which catalogue this belongs to. The storefront serves the two on
     * different routes, and uses this to send a stale link to the right one.
     */
    fulfillment,
    title: doc.title,
    sku: doc.sku ?? null,
    vendor: doc.vendor ?? "",
    type: doc.type ?? "",
    tags: doc.tags ?? [],

    description: doc.description ?? "",
    shortDescription: doc.shortDescription ?? "",
    details: (doc.details ?? [])
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((row) => ({ key: row.key, label: row.label, value: row.value })),

    images: (doc.images ?? [])
      .slice()
      .sort(byFeaturedThenPosition)
      .map((img) => ({ url: img.url, alt: img.alt || doc.title })),
    videos: (doc.videos ?? []).map((video) => ({
      url: video.url,
      thumbnail: video.thumbnail || "",
      type: video.type,
    })),

    price: doc.price ?? 0,
    compareAtPrice: doc.compareAtPrice ?? null,
    currency: doc.currency || "INR",
    taxable: doc.taxable !== false,
    taxClass: doc.taxClass ?? null,

    hasVariants: Boolean(doc.hasVariants),
    options: doc.options ?? [],
    variants: (doc.variants ?? []).map((variant) => ({
      id: String(variant._id ?? ""),
      sku: variant.sku,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice ?? null,
      image: variant.image || "",
      optionValues: variant.optionValues ?? {},
      active: variant.active !== false,
    })),

    available: unlimited || stock > 0,
    stock,

    isGiftable: doc.isGiftable !== false,
    allowGiftMessage: doc.allowGiftMessage !== false,
    giftWrapAvailable: Boolean(doc.giftWrapAvailable),
    giftBoxCompatible: Boolean(doc.giftBoxCompatible),

    weight: doc.weight ?? null,
    weightUnit: doc.weightUnit ?? "g",
    dimensions: doc.dimensions ?? null,

    suggestedOccasions: doc.suggestedOccasions ?? [],
    suggestedRecipient: doc.suggestedRecipient ?? [],
    ratingAverage: doc.ratingAverage ?? 0,
    ratingCount: doc.ratingCount ?? 0,

    category: doc.category
      ? { name: doc.category.name, slug: doc.category.slug }
      : null,
    subcategory: doc.subcategory
      ? { name: doc.subcategory.name, slug: doc.subcategory.slug }
      : null,

    seo: {
      metaTitle: doc.seo?.metaTitle || doc.title,
      metaDescription: doc.seo?.metaDescription || doc.shortDescription || "",
    },
  };
}

/** Featured image first, then declared order — drives the gallery. */
function byFeaturedThenPosition(a, b) {
  if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) {
    return a.isFeatured ? -1 : 1;
  }
  return (a.position ?? 0) - (b.position ?? 0);
}
