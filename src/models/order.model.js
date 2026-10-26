import mongoose from "mongoose";
import { ORDER_STATUS, ORDER_STATUS_VALUES } from "@/constants/enums";

/**
 * A placed order.
 *
 * Line items are a **snapshot**, not a reference. Titles and prices are
 * copied at purchase time so an admin renaming or repricing a product later
 * cannot rewrite history on an order that has already been paid.
 *
 * Money is integer paise throughout, like Product.price.
 */
export const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    slug: { type: String, default: "" },
    /**
     * The SKU the stock actually came off. Snapshotted like the title and the
     * price, so a later SKU change cannot make an old order impossible to
     * reconcile against its stock movements.
     */
    sku: { type: String, default: "" },
    title: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    image: {
      url: { type: String, default: "" },
      alt: { type: String, default: "" },
    },
  },
  { _id: false }
);

/**
 * Add-ons are snapshotted for the same reason as line items.
 *
 * Exported alongside `orderItemSchema` because Inquiry stores the same two
 * shapes: an enquiry's box is priced from the catalog by the same code that
 * prices an order, so redeclaring them would be two definitions of one thing.
 */
export const orderAddonSchema = new mongoose.Schema(
  {
    optionId: { type: String, default: "" },
    name: { type: String, default: "" },
    image: { type: String, default: "" },
    price: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

/**
 * The corporate logo to print on the card, in the PRIVATE uploads bucket.
 *
 * Only the key is stored, never a URL: the bucket has no public URL, and the
 * dashboard signs a short-lived one each time it shows the file. Everything
 * here was checked by verifyCardLogo before it was written. Null when no
 * logo was given — it is optional.
 *
 * Exported for Inquiry, for the same reason as `orderAddonSchema`.
 */
export const cardLogoSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    format: { type: String, enum: ["svg", "pdf", "png"], required: true },
    fileName: { type: String, default: "" },
    size: { type: Number, default: 0, min: 0 },
    /** PNG only — vectors have no pixel size. */
    width: { type: Number, default: null },
    height: { type: Number, default: null },
  },
  { _id: false }
);

/**
 * Corporate context. Absent entirely on individual orders.
 *
 * Contact details are deliberately NOT repeated here — an order already
 * carries `contact` (name, email, phone), and a second copy of the same
 * person would drift the moment either was edited. This holds only what a
 * corporate order has that a personal one does not.
 *
 * `occasion` and `limits` snapshot the quota that produced the box, so the
 * admin can see "Diwali, 5 women + 5 men" rather than ten unexplained line
 * items. Descriptive only — nothing monetary is derived from them.
 */
const orderCorporateSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    neededBy: { type: Date, default: null },
    notes: { type: String, default: "", trim: true },
    occasion: { type: String, default: "", trim: true },
    limits: { type: Map, of: Number, default: {} },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },

    /** Set once customer accounts exist; null for guest checkouts. */
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },

    contact: {
      fullName: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true, index: true },
    },

    address: {
      line1: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "An order needs at least one item",
      },
    },

    packaging: { type: orderAddonSchema, default: () => ({}) },
    card: { type: orderAddonSchema, default: () => ({}) },
    cardMessage: { type: String, default: "", trim: true },
    /** Corporate orders only, and optional there. */
    cardLogo: { type: cardLogoSchema, default: null },

    /** Every figure computed server-side from the catalog. */
    amounts: {
      subtotal: { type: Number, required: true, min: 0 },
      packaging: { type: Number, default: 0, min: 0 },
      card: { type: Number, default: 0, min: 0 },
      shipping: { type: Number, default: 0, min: 0 },
      total: { type: Number, required: true, min: 0 },
    },
    currency: { type: String, default: "INR" },

    status: {
      type: String,
      enum: ORDER_STATUS_VALUES,
      default: ORDER_STATUS.PENDING_PAYMENT,
      index: true,
    },

    /**
     * Razorpay linkage. Uniqueness is enforced by a partial index below —
     * see the note there for why `sparse` cannot work here.
     */
    payment: {
      provider: { type: String, default: "razorpay" },
      razorpayOrderId: { type: String, default: null },
      razorpayPaymentId: { type: String, default: null },
      paidAt: { type: Date, default: null },
      failureReason: { type: String, default: "" },
    },

    /** Null on individual orders — the field is what marks an order corporate. */
    corporate: { type: orderCorporateSchema, default: null },

    /** The phone that passed OTP — the audit trail for a guest order. */
    verifiedPhone: { type: String, default: "", trim: true },

    /**
     * Something happened that a person has to sort out — today that means the
     * payment landed after the stock hold had expired and the item may have
     * gone to somebody else. Indexed so the admin can list them without
     * scanning every order.
     */
    needsReview: { type: Boolean, default: false, index: true },
    reviewNote: { type: String, default: "" },

    internalNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

/**
 * One gateway order maps to exactly one of ours — the property that makes
 * webhook replays idempotent.
 *
 * Partial, not sparse: `sparse` only skips documents where the field is
 * *absent*, and the schema default writes an explicit `null`. Every unpaid
 * order would therefore collide on `null`. Same pattern as the SKU index in
 * product.model.js.
 */
orderSchema.index(
  { "payment.razorpayOrderId": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "payment.razorpayOrderId": { $type: "string" },
    },
  }
);
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

/**
 * Corporate orders only — lets the dashboard filter to them, and look one up
 * by company, without scanning every personal order.
 *
 * Partial rather than sparse for the same reason as the Razorpay index above:
 * the schema writes an explicit `null` for individual orders, and `sparse`
 * only skips documents where the field is absent.
 */
orderSchema.index(
  { "corporate.companyName": 1, createdAt: -1 },
  { partialFilterExpression: { "corporate.companyName": { $type: "string" } } }
);

/** Total items, not line count — "3 items" reads better than "2 lines". */
orderSchema.virtual("itemCount").get(function itemCount() {
  return (this.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.set("toJSON", { virtuals: true });
orderSchema.set("toObject", { virtuals: true });

export const Order =
  mongoose.models.Order || mongoose.model("Order", orderSchema);

/** "AKT-2026-483920" — human-readable, quoted in WhatsApp and support. */
export function generateOrderNumber() {
  const year = new Date().getFullYear();
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `AKT-${year}-${suffix}`;
}
