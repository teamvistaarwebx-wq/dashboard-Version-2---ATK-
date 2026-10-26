import mongoose from "mongoose";
import {
  INQUIRY_SOURCE,
  INQUIRY_SOURCE_VALUES,
  INQUIRY_STATUS,
  INQUIRY_STATUS_VALUES,
  OPEN_INQUIRY_STATUS_VALUES,
} from "@/constants/enums";
import {
  cardLogoSchema,
  orderAddonSchema,
  orderItemSchema,
} from "./order.model";

/**
 * A corporate gifting enquiry — "we need 40 boxes for Diwali, roughly ₹5,000
 * each". It precedes an Order and often never becomes one, so it cannot be
 * modelled as an Order with a draft status.
 *
 * `budget` is the whole enquiry's indicative spend in paise, matching every
 * other money field in the app. It is what the enquirer said, not a quote.
 *
 * Two ways one is created:
 *
 *   - `manual` — sales typed up a phone call. Contact and headcount only.
 *   - `corporate_form` — the storefront's Request a Quote path. Carries the whole
 *     gift box as well, which is why `items`, `address` and `amounts` mirror
 *     Order field for field. Everything below `message` is optional so the
 *     manual shape stays valid.
 *   - `made_to_order` — the storefront's quote box of made-to-order pieces.
 *     One line in `items` per piece (and how many), contact details, an
 *     optional company and `leadTimeDays`. No packaging, card or address: the team
 *     settles all of that on the call.
 */
const inquirySchema = new mongoose.Schema(
  {
    /**
     * "AKT-ENQ-2026-483920" — quoted back to the enquirer on the thank-you
     * screen and in the follow-up call.
     *
     * Optional and partial-indexed rather than required: enquiries typed in
     * by sales have no reference to quote, and a required field would break
     * every one of them.
     */
    inquiryNumber: { type: String, default: null, trim: true },

    contactName: { type: String, required: true, trim: true },
    /**
     * Required for every source except `made_to_order`, where an individual
     * can ask too. Checked per source in the create functions rather than
     * here, so one schema serves all three.
     */
    companyName: { type: String, default: "", trim: true },

    email: { type: String, default: "", lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },

    /** Set when a signed-in shopper sent it; null for guests and manual entry. */
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },

    /** Headcount to gift — drives the "12 people" line on the dashboard. */
    headcount: { type: Number, default: 0, min: 0 },

    /** Indicative total spend in paise. */
    budget: { type: Number, default: 0, min: 0 },

    occasion: { type: String, default: "", trim: true },
    neededBy: { type: Date, default: null },
    message: { type: String, default: "", trim: true },

    // --- The gift box, on `corporate_form` enquiries -----------------------
    // Priced server-side from the catalog by the same code that prices an
    // order (features/gifting/lib/price-box.js). Nothing monetary here comes
    // from the browser, even though none of it is being charged.

    /** Empty on a manual enquiry — sales had no box to record. */
    items: { type: [orderItemSchema], default: [] },

    packaging: { type: orderAddonSchema, default: () => ({}) },
    card: { type: orderAddonSchema, default: () => ({}) },
    cardMessage: { type: String, default: "", trim: true },
    /** Optional company logo for the card — see cardLogoSchema. */
    cardLogo: { type: cardLogoSchema, default: null },

    /**
     * Not `required`, unlike Order.address: an enquiry is a question, and the
     * team can quote a 200-box run before anyone has settled on where it ships.
     */
    address: {
      line1: { type: String, default: "", trim: true },
      city: { type: String, default: "", trim: true },
      pincode: { type: String, default: "", trim: true },
      state: { type: String, default: "", trim: true },
    },

    /**
     * Indicative, NOT a quote. `total` is copied into `budget` so the
     * dashboard's open-pipeline sum keeps working without knowing about this.
     */
    amounts: {
      subtotal: { type: Number, default: 0, min: 0 },
      packaging: { type: Number, default: 0, min: 0 },
      card: { type: Number, default: 0, min: 0 },
      total: { type: Number, default: 0, min: 0 },
    },
    currency: { type: String, default: "INR" },

    /** The quota that shaped the ask — { women: 40, men: 60 }. */
    categoryLimits: { type: Map, of: Number, default: {} },

    /**
     * Made to order only: the delivery estimate the customer was shown, in
     * days, worked out server-side from the quantity. Null above the last
     * tier, where the team confirms the date on the call — and on every
     * other source. Informational; the real date is agreed with them.
     */
    leadTimeDays: { type: Number, default: null, min: 0 },

    source: {
      type: String,
      enum: INQUIRY_SOURCE_VALUES,
      default: INQUIRY_SOURCE.MANUAL,
    },

    status: {
      type: String,
      enum: INQUIRY_STATUS_VALUES,
      default: INQUIRY_STATUS.NEW,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
    },

    internalNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

/** The Inquiries list and the dashboard panel both read status + recency. */
inquirySchema.index({ status: 1, createdAt: -1 });

/**
 * Partial, not sparse: the schema default writes an explicit `null` for every
 * manual enquiry, and `sparse` only skips documents where the field is
 * *absent* — so they would all collide on `null`. Same pattern as the Razorpay
 * index in order.model.js.
 */
inquirySchema.index(
  { inquiryNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { inquiryNumber: { $type: "string" } },
  }
);

/** Open pipeline: everything that has not been won or lost yet. */
inquirySchema.statics.openFilter = function openFilter() {
  return { status: { $in: OPEN_INQUIRY_STATUS_VALUES } };
};

/** Total items, not line count — mirrors Order.itemCount. */
inquirySchema.virtual("itemCount").get(function itemCount() {
  return (this.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
});

inquirySchema.set("toJSON", { virtuals: true });
inquirySchema.set("toObject", { virtuals: true });

/**
 * Recompiled on every re-evaluation in dev, rather than reused.
 *
 * `mongoose.models` lives on the mongoose singleton, which outlives HMR. So
 * once any page has read an Inquiry, editing this file re-evaluates the module
 * but the `||` below short-circuits and the OLD schema stays registered — and
 * because `strict` defaults to true, the next write silently DROPS every field
 * the old schema didn't know about instead of erroring. That cost us one
 * enquiry saved without its items.
 *
 * The guard is dev-only: in production nothing re-evaluates, and the `||` is
 * there to survive a serverless warm start.
 */
if (process.env.NODE_ENV !== "production" && mongoose.models.Inquiry) {
  mongoose.deleteModel("Inquiry");
}

export const Inquiry =
  mongoose.models.Inquiry || mongoose.model("Inquiry", inquirySchema);

/** "AKT-ENQ-2026-483920" — the reference shown on the thank-you screen. */
export function generateInquiryNumber() {
  const year = new Date().getFullYear();
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `AKT-ENQ-${year}-${suffix}`;
}
