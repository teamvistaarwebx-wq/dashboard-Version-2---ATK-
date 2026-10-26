import mongoose from "mongoose";
import {
  DIMENSION_UNIT_VALUES,
  FULFILLMENT,
  FULFILLMENT_VALUES,
  PRODUCT_STATUS,
  PRODUCT_STATUS_VALUES,
  TAX_CLASS_VALUES,
  VIDEO_TYPE_VALUES,
  WEIGHT_UNIT,
  WEIGHT_UNIT_VALUES,
} from "@/constants/enums";

function slugifyKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const detailSchema = new mongoose.Schema(
  {
    key: { type: String, trim: true },
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    position: { type: Number, default: 0 },
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    position: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    position: { type: Number, default: 0 },
    thumbnail: { type: String, default: "" },
    type: {
      type: String,
      enum: VIDEO_TYPE_VALUES,
      default: "upload",
    },
  },
  { _id: false }
);

const dimensionsSchema = new mongoose.Schema(
  {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    unit: {
      type: String,
      enum: DIMENSION_UNIT_VALUES,
      default: "cm",
    },
  },
  { _id: false }
);

const seoSchema = new mongoose.Schema(
  {
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
  },
  { _id: false }
);

const variantOptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    values: [{ type: String, trim: true }],
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    image: { type: String, default: "" },
    optionValues: { type: Map, of: String, default: {} },
    weight: { type: Number, min: 0 },
    active: { type: Boolean, default: true },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    // Identity
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    sku: { type: String, trim: true },
    vendor: { type: String, default: "Atulyakarigari", trim: true },

    // Categorization
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
      index: true,
    },
    type: { type: String, trim: true, default: "" },
    tags: [{ type: String, trim: true }],
    collections: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Collection" },
    ],
    suggestedOccasions: [{ type: String, trim: true }],
    suggestedRecipient: [{ type: String, trim: true }],

    // Content
    description: { type: String, required: true },
    shortDescription: { type: String, default: "", trim: true },
    details: [detailSchema],

    // Media
    images: {
      type: [imageSchema],
      validate: {
        validator(images) {
          return Array.isArray(images) && images.length > 0;
        },
        message: "At least one image is required",
      },
    },
    videos: [videoSchema],

    // Pricing (used when hasVariants === false)
    price: { type: Number, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    costPrice: { type: Number, min: 0 },
    currency: { type: String, default: "INR" },
    taxable: { type: Boolean, default: true },
    taxClass: {
      type: String,
      enum: TAX_CLASS_VALUES,
      default: "GST_5",
    },
    hsnCode: { type: String, trim: true, default: "", index: true },

    // Variants
    hasVariants: { type: Boolean, default: false },
    options: [variantOptionSchema],
    variants: [variantSchema],

    /**
     * In stock or made to order — two catalogues in one collection, so a
     * made-to-order saree keeps the same images, categories, slug space and
     * admin form as any other. See FULFILLMENT in constants/enums.js.
     *
     * Set when the product is created and never changed afterwards: moving a
     * product between the two would strand its stock rows or its enquiries.
     */
    fulfillment: {
      type: String,
      enum: FULFILLMENT_VALUES,
      default: FULFILLMENT.IN_STOCK,
    },

    // Inventory flags (qty lives in Inventory collection)
    trackInventory: { type: Boolean, default: true },
    allowBackorder: { type: Boolean, default: false },
    lowStockThreshold: { type: Number, default: 5, min: 0 },

    // Shipping & physical
    weight: { type: Number, min: 0 },
    weightUnit: {
      type: String,
      enum: WEIGHT_UNIT_VALUES,
      default: WEIGHT_UNIT.G,
    },
    dimensions: dimensionsSchema,
    requiresShipping: { type: Boolean, default: true },

    // SEO
    seo: { type: seoSchema, default: () => ({}) },

    // Gifting
    isGiftable: { type: Boolean, default: true },
    allowGiftMessage: { type: Boolean, default: true },
    giftWrapAvailable: { type: Boolean, default: false },
    giftBoxCompatible: { type: Boolean, default: false },

    // Merchandising / analytics (denormalized)
    relatedProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],
    views: { type: Number, default: 0, min: 0 },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0 },

    // Lifecycle
    status: {
      type: String,
      enum: PRODUCT_STATUS_VALUES,
      default: PRODUCT_STATUS.DRAFT,
      index: true,
    },
    publishedAt: { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },

    // Admin metadata
    internalNotes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
  },
  { timestamps: true }
);

// No `next` parameter — Mongoose 9 does not pass one. Errors are thrown.
productSchema.pre("validate", function normalizeProduct() {
  // details.key from label
  if (Array.isArray(this.details)) {
    this.details = this.details.map((row, index) => {
      const label = row.label || "";
      const key = row.key ? slugifyKey(row.key) : slugifyKey(label);
      return {
        key,
        label,
        value: row.value,
        position: row.position ?? index,
      };
    });
  }

  // Exactly one featured image
  if (Array.isArray(this.images) && this.images.length > 0) {
    const featuredIndexes = this.images
      .map((img, i) => (img.isFeatured ? i : -1))
      .filter((i) => i >= 0);

    if (featuredIndexes.length !== 1) {
      this.images = this.images.map((img, i) => ({
        ...img.toObject?.() ?? img,
        isFeatured: i === 0,
      }));
    }
  }

  // Made to order means woven on demand — there is nothing to count. Enforced
  // here as well as in the form, so no write path can give one stock.
  if (this.fulfillment === FULFILLMENT.MADE_TO_ORDER) {
    this.trackInventory = false;
    this.allowBackorder = false;
    this.giftBoxCompatible = false;
  }

  // Single source of truth: clear product sku/price when using variants
  if (this.hasVariants) {
    this.sku = undefined;
    this.price = undefined;
    this.compareAtPrice = undefined;

    if (!Array.isArray(this.variants) || this.variants.length === 0) {
      throw new Error("variants are required when hasVariants is true");
    }
  } else {
    this.options = [];
    this.variants = [];

    if (!this.sku) {
      throw new Error("sku is required when hasVariants is false");
    }
    if (this.price == null) {
      throw new Error("price is required when hasVariants is false");
    }
  }
});

productSchema.index({ slug: 1 }, { unique: true });

// Product SKU unique only for non-variant products
productSchema.index(
  { sku: 1 },
  {
    unique: true,
    partialFilterExpression: {
      hasVariants: false,
      sku: { $type: "string" },
    },
  }
);

// Variant SKUs unique across catalog
productSchema.index(
  { "variants.sku": 1 },
  {
    unique: true,
    partialFilterExpression: {
      hasVariants: true,
      "variants.sku": { $type: "string" },
    },
  }
);

productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ status: 1, publishedAt: -1 });
productSchema.index({ isDeleted: 1, status: 1 });
// Both storefront listings split on this first. Create it by hand in Atlas —
// autoIndex is off in production (see models/README.md).
productSchema.index({ fulfillment: 1, status: 1, isDeleted: 1 });
productSchema.index(
  { title: "text", description: "text", tags: "text", shortDescription: "text" },
  { name: "product_text_search" }
);

/** Read-time helper: "from ₹X" for variant products */
productSchema.methods.getPriceRange = function getPriceRange() {
  if (!this.hasVariants) {
    return {
      min: this.price ?? 0,
      max: this.price ?? 0,
      varies: false,
    };
  }

  const prices = (this.variants || [])
    .filter((v) => v.active !== false)
    .map((v) => v.price)
    .filter((p) => typeof p === "number");

  if (prices.length === 0) {
    return { min: 0, max: 0, varies: false };
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, varies: min !== max };
};

/**
 * Recompiled on every re-evaluation in dev — same guard, and the same reason,
 * as inquiry.model.js: a stale schema left on the mongoose singleton by HMR
 * would silently drop any field it does not know (`fulfillment` included)
 * on the next write.
 */
if (process.env.NODE_ENV !== "production" && mongoose.models.Product) {
  mongoose.deleteModel("Product");
}

export const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);
