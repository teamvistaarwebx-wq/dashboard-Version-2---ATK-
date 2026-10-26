/** Shared enums for catalog / inventory models */

export const PRODUCT_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  ARCHIVED: "archived",
};

export const PRODUCT_STATUS_VALUES = Object.values(PRODUCT_STATUS);

export const TAX_CLASS = {
  GST_5: "GST_5",
  GST_12: "GST_12",
  GST_18: "GST_18",
  EXEMPT: "EXEMPT",
};

export const TAX_CLASS_VALUES = Object.values(TAX_CLASS);

export const WEIGHT_UNIT = {
  G: "g",
  KG: "kg",
};

export const WEIGHT_UNIT_VALUES = Object.values(WEIGHT_UNIT);

export const DIMENSION_UNIT = {
  CM: "cm",
  IN: "in",
};

export const DIMENSION_UNIT_VALUES = Object.values(DIMENSION_UNIT);

export const VIDEO_TYPE = {
  UPLOAD: "upload",
  YOUTUBE: "youtube",
  VIMEO: "vimeo",
};

export const VIDEO_TYPE_VALUES = Object.values(VIDEO_TYPE);

/**
 * How a product reaches the customer.
 *
 *   in_stock      — woven already, counted in Inventory, bought through the
 *                   gift box and checkout.
 *   made_to_order — woven once someone commits to a quantity. No stock, never
 *                   in the gift box, never ordered: the only way in is a
 *                   quote request, which becomes an Inquiry.
 *
 * The two catalogues never mix. Every storefront listing filters on this, and
 * the order path refuses a made-to-order line outright.
 */
export const FULFILLMENT = {
  IN_STOCK: "in_stock",
  MADE_TO_ORDER: "made_to_order",
};

export const FULFILLMENT_VALUES = Object.values(FULFILLMENT);

/**
 * Filter for the in-stock catalogue. `$ne` rather than `IN_STOCK`, so products
 * saved before the field existed — which have no `fulfillment` at all — still
 * match without a migration.
 */
export const IN_STOCK_FILTER = { fulfillment: { $ne: FULFILLMENT.MADE_TO_ORDER } };

/**
 * Add-ons chosen per gift box, not per product. Extensible — "ribbon" and
 * "wrap" slot in here without a new model.
 */
export const GIFT_OPTION_TYPE = {
  PACKAGING: "packaging",
  CARD_DESIGN: "card-design",
};

export const GIFT_OPTION_TYPE_VALUES = Object.values(GIFT_OPTION_TYPE);

/**
 * Order lifecycle.
 *
 *   pending_payment ──▶ paid ──▶ confirmed ──▶ shipped ──▶ delivered
 *         │
 *         ├─▶ payment_failed
 *         └─▶ expired          (reservation released)
 *
 * An order starts at pending_payment BEFORE the Razorpay popup opens, so a
 * lost browser callback is still recoverable from the webhook.
 */
export const ORDER_STATUS = {
  PENDING_PAYMENT: "pending_payment",
  PAID: "paid",
  CONFIRMED: "confirmed",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  PAYMENT_FAILED: "payment_failed",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
};

export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

export const MOVEMENT_REASON = {
  RESTOCK: "restock",
  ADJUSTMENT: "adjustment",
  SALE: "sale",
  RESERVATION: "reservation",
  RELEASE: "release",
  RETURN: "return",
  DAMAGE: "damage",
};

export const MOVEMENT_REASON_VALUES = Object.values(MOVEMENT_REASON);

export const RESERVATION_STATUS = {
  ACTIVE: "active",
  CONSUMED: "consumed",
  RELEASED: "released",
  EXPIRED: "expired",
};

export const RESERVATION_STATUS_VALUES = Object.values(RESERVATION_STATUS);

/**
 * Order statuses that represent money actually taken. Revenue and the
 * dashboard's sales chart count these and nothing else — a
 * `pending_payment` order is a browser tab, not a sale.
 */
export const PAID_ORDER_STATUS_VALUES = [
  ORDER_STATUS.PAID,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
];

/**
 * Admin staff roles.
 *
 *   super_admin — everything, including inviting and removing staff
 *   admin       — full catalogue, orders and inquiries; cannot manage staff
 *   staff       — day-to-day fulfilment; no destructive catalogue actions
 *
 * Exactly one super_admin is created by the seed script; the rest are invited.
 */
export const ADMIN_ROLE = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  STAFF: "staff",
};

export const ADMIN_ROLE_VALUES = Object.values(ADMIN_ROLE);

/**
 * Who may pull something out of the catalogue. Staff run fulfilment, so the
 * delete control is hidden from them AND refused inside the action — the
 * hidden button is a courtesy, the check is the boundary.
 */
export const CATALOG_DESTRUCTIVE_ROLES = [
  ADMIN_ROLE.SUPER_ADMIN,
  ADMIN_ROLE.ADMIN,
];

/**
 * invited  — record exists, no password yet, cannot sign in
 * active   — accepted the invite, can sign in
 * disabled — kept for the audit trail on past orders, cannot sign in
 */
export const ADMIN_STATUS = {
  INVITED: "invited",
  ACTIVE: "active",
  DISABLED: "disabled",
};

export const ADMIN_STATUS_VALUES = Object.values(ADMIN_STATUS);

/** Corporate gifting enquiry lifecycle. */
export const INQUIRY_STATUS = {
  NEW: "new",
  CONTACTED: "contacted",
  QUOTED: "quoted",
  WON: "won",
  LOST: "lost",
};

export const INQUIRY_STATUS_VALUES = Object.values(INQUIRY_STATUS);

/** Still in play — the sum of their budgets is the "open pipeline". */
export const OPEN_INQUIRY_STATUS_VALUES = [
  INQUIRY_STATUS.NEW,
  INQUIRY_STATUS.CONTACTED,
  INQUIRY_STATUS.QUOTED,
];

export const INQUIRY_SOURCE = {
  CORPORATE_FORM: "corporate_form",
  /** A quote request for one made-to-order product, from its popup. */
  MADE_TO_ORDER: "made_to_order",
  MANUAL: "manual",
};

/** What the Inquiries list and detail page call each source. */
export const INQUIRY_SOURCE_LABEL = {
  [INQUIRY_SOURCE.CORPORATE_FORM]: "Gift box",
  [INQUIRY_SOURCE.MADE_TO_ORDER]: "Made to order",
  [INQUIRY_SOURCE.MANUAL]: "Manual",
};

export const INQUIRY_SOURCE_VALUES = Object.values(INQUIRY_SOURCE);

/**
 * Above this many total gifts we refuse an Order and take an enquiry instead
 * — a 200-box run is quoted by the team, not checked out.
 *
 * Mirrored as MAX_ORDER_HEADCOUNT in the storefront's constants/corporate.js,
 * which closes the same door in the UI. This copy is the one that matters:
 * `corporate.limits` reaches create-order.js from a user-writable gift box,
 * so the UI gate alone would not stop a tampered client.
 */
export const MAX_ORDER_HEADCOUNT = 50;

/**
 * Seed catalog shape (Women / Men).
 * Used by seed scripts — not hardcoded into Product schema.
 */
export const CATALOG_SEED = {
  women: {
    name: "Women",
    slug: "women",
    subcategories: [
      { name: "Saree", slug: "saree" },
      { name: "Dupatta", slug: "dupatta" },
      { name: "Jewellery", slug: "jewellery" },
      { name: "Footwear", slug: "footwear" },
      { name: "Other Collection", slug: "other-collection" },
    ],
  },
  men: {
    name: "Men",
    slug: "men",
    subcategories: [
      { name: "Tie", slug: "tie" },
      { name: "Other Collection", slug: "other-collection" },
    ],
  },
};
