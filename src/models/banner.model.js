import mongoose from "mongoose";

/**
 * Homepage hero banner.
 *
 * v1 scope:
 *  - Single banner shown on the storefront home page.
 *  - Multiple documents allowed; only ONE can be `isActive: true` at a time
 *    (enforced in pre-save hook — activating one auto-deactivates others).
 *  - Image holds the text visually; `overlay.*` fields are kept for future
 *    use (admin form hides them for now; storefront skips overlay layer
 *    unless `hasOverlay` is true).
 *
 * Image sizes — taken from what the storefront actually renders, which is
 * `--aspect-banner-desktop` / `--aspect-banner-mobile` in its globals.css.
 * The single source for the admin form is BANNER_DESKTOP / BANNER_MOBILE in
 * constants/media.js; these are the same numbers, spelled out:
 *
 *  - Desktop: 1724 × 587 (2.937:1), or 3448 × 1174 for retina.
 *    CROPPED. It sits in a fixed-ratio box under `object-cover`, so any other
 *    ratio loses its top and bottom.
 *  - Mobile:  736 × 980 (0.751:1).
 *    NOT cropped — it renders at its natural ratio and pushes the page down.
 *    `width`/`height` below are what the storefront lays out from, so they
 *    must be the file's true pixels or the page shifts as it loads.
 *
 * An earlier version of this comment said 1920 × 720 and 1080 × 1350. Neither
 * matched the CSS, and artwork cut to them was silently cropped.
 */

// Local enums — move to `@/constants/enums.js` later if reused elsewhere.
const BANNER_LINK_TYPE_VALUES = [
  "product",
  "category",
  "subcategory",
  "collection",
  "url",
  "none",
];

const TEXT_POSITION_VALUES = ["left", "center", "right"];

const bannerImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, required: true, trim: true },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
  },
  { _id: false }
);

const bannerOverlaySchema = new mongoose.Schema(
  {
    headline: { type: String, default: "", trim: true },
    subheadline: { type: String, default: "", trim: true },
    ctaText: { type: String, default: "", trim: true },
    textColor: { type: String, default: "", trim: true }, // hex, e.g. "#FFFFFF"
    textPosition: {
      type: String,
      enum: TEXT_POSITION_VALUES,
      default: "center",
    },
  },
  { _id: false }
);

const bannerLinkSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: BANNER_LINK_TYPE_VALUES,
      default: "none",
    },
    // ref resolves against Product / Category / Subcategory / Collection
    // depending on `type`. Kept as raw ObjectId (no `ref`) because it's
    // polymorphic — populate manually based on `type`.
    ref: { type: mongoose.Schema.Types.ObjectId },
    url: { type: String, default: "", trim: true }, // for type === "url"
    openInNewTab: { type: Boolean, default: false },
  },
  { _id: false }
);

const bannerSchema = new mongoose.Schema(
  {
    // Internal admin label — NOT shown to end users.
    name: { type: String, required: true, trim: true },

    // Responsive images — both required.
    desktop: { type: bannerImageSchema, required: true },
    mobile: { type: bannerImageSchema, required: true },

    // Overlay text (v1: hidden in admin form, empty on save).
    hasOverlay: { type: Boolean, default: false },
    overlay: { type: bannerOverlaySchema, default: () => ({}) },

    // Click destination.
    link: { type: bannerLinkSchema, default: () => ({}) },

    // Single active banner rule.
    isActive: { type: Boolean, default: false, index: true },

    // Admin metadata.
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
  },
  { timestamps: true }
);

/**
 * Enforce link consistency:
 *  - type in [product, category, subcategory, collection] → `ref` required
 *  - type === "url" → `url` required
 *  - type === "none" → both cleared
 */
// No `next` parameter — Mongoose 9 does not pass one. Errors are thrown.
bannerSchema.pre("validate", function normalizeBannerLink() {
  const link = this.link || {};
  const needsRef = ["product", "category", "subcategory", "collection"];

  if (needsRef.includes(link.type)) {
    if (!link.ref) {
      throw new Error(`link.ref is required when link.type is "${link.type}"`);
    }
    this.link.url = "";
  } else if (link.type === "url") {
    if (!link.url) {
      throw new Error('link.url is required when link.type is "url"');
    }
    this.link.ref = undefined;
  } else {
    // "none"
    this.link.ref = undefined;
    this.link.url = "";
  }
});

/**
 * Only one banner may be active at a time.
 * When a banner is saved as active, deactivate all others.
 */
// Async hook, no `next` — a rejected promise aborts the save.
bannerSchema.pre("save", async function enforceSingleActive() {
  if (!this.isActive || !this.isModified("isActive")) return;

  await this.constructor.updateMany(
    { _id: { $ne: this._id }, isActive: true },
    { $set: { isActive: false } }
  );
});

/**
 * Convenience: the storefront's single query.
 *   const banner = await Banner.getActive();
 */
bannerSchema.statics.getActive = function getActive() {
  return this.findOne({ isActive: true });
};

/**
 * Recompiled on every re-evaluation in dev — see the same guard on Inquiry.
 *
 * `mongoose.models` outlives HMR, so editing this schema would otherwise be
 * ignored until a restart, and Mongoose's strict mode would silently DROP the
 * new fields on the next write rather than erroring. No-op in production.
 */
if (process.env.NODE_ENV !== "production" && mongoose.models.Banner) {
  mongoose.deleteModel("Banner");
}

export const Banner =
  mongoose.models.Banner || mongoose.model("Banner", bannerSchema);
