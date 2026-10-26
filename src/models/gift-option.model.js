import mongoose from "mongoose";
import {
  GIFT_OPTION_TYPE,
  GIFT_OPTION_TYPE_VALUES,
} from "@/constants/enums";

/**
 * Box-level add-ons: packaging and card designs today, ribbons and wraps
 * later. One model with a `type` discriminator rather than a model per kind,
 * so a new kind is an enum value instead of a new collection + endpoint.
 *
 * Deliberately NOT a Product: these must never appear in catalog listings,
 * search, or related-product scoring.
 */
const giftOptionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: GIFT_OPTION_TYPE_VALUES,
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    image: { type: String, default: "" },
    description: { type: String, default: "", trim: true },

    /** Integer paise, like Product.price. Both types are priced. */
    price: { type: Number, default: 0, min: 0 },

    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    /**
     * Preselected for its type. Packaging is always priced, so exactly one
     * default must exist or the cart total is ambiguous.
     */
    isDefault: { type: Boolean, default: false },

    /**
     * card-design only. A design with a large illustration has less room for
     * text, so the limit belongs per design rather than in global config.
     */
    maxMessageLength: { type: Number, min: 0 },

    /** packaging only. Max items the box physically fits. */
    capacity: { type: Number, min: 0 },
  },
  { timestamps: true }
);

// A packaging and a card design may share a slug ("classic"), so uniqueness
// is scoped to the type.
giftOptionSchema.index({ type: 1, slug: 1 }, { unique: true });
giftOptionSchema.index({ type: 1, isActive: 1, order: 1 });

// No `next` parameter — Mongoose 9 does not pass one to pre hooks.
giftOptionSchema.pre("validate", function normalizeGiftOption() {
  // Message limits are meaningless on packaging, capacity on a card.
  if (this.type === GIFT_OPTION_TYPE.PACKAGING) {
    this.maxMessageLength = undefined;
  } else {
    this.capacity = undefined;
  }

  // The cart preselects the default, so a hidden default would preselect
  // something the shopper cannot see. Making an option default shows it.
  if (this.isDefault) this.isActive = true;
});

/**
 * One default per type. Saving an option as default takes the flag off every
 * other option of the same type — the same arrangement as Banner's single
 * live banner, and for the same reason: it lives on the model so no screen
 * can get round it.
 *
 * Only runs through document saves. Every write in the admin goes through
 * load + save() for exactly this reason; an updateMany that sets isDefault
 * would skip it.
 */
// Async hook, no `next` — a rejected promise aborts the save.
giftOptionSchema.pre("save", async function enforceSingleDefault() {
  if (!this.isDefault) return;
  if (!this.isNew && !this.isModified("isDefault")) return;

  await this.constructor.updateMany(
    { _id: { $ne: this._id }, type: this.type, isDefault: true },
    { $set: { isDefault: false } }
  );
});

export const GiftOption =
  mongoose.models.GiftOption ||
  mongoose.model("GiftOption", giftOptionSchema);
