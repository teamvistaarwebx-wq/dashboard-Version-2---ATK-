import {
  FULFILLMENT,
  FULFILLMENT_VALUES,
  PRODUCT_STATUS,
  TAX_CLASS,
  TAX_CLASS_VALUES,
} from "@/constants/enums";
import { MAX_PRODUCT_IMAGES } from "@/constants/media";

/**
 * Turns the product drawer's FormData into something Mongoose will accept.
 *
 * Lives apart from the action so the conversions that actually bite — rupees
 * to paise, the JSON-encoded arrays, "on" to true — are readable in one place
 * rather than spread through a 200-line handler.
 *
 * Validation here exists to produce a good message, keyed by field name so the
 * form can print it under the input that caused it. The model's pre-validate
 * hook is still the boundary: it re-checks the sku, the price and the featured
 * image regardless of what this returns.
 *
 * Fields the form no longer asks for — seo, suggestedRecipient, dimensions,
 * requiresShipping, weightUnit, vendor — are deliberately absent from the
 * returned values. `updateProduct` only writes the keys it is handed, so
 * leaving them out preserves whatever an existing product already has instead
 * of blanking it. New products get the schema defaults.
 */

/** Hoisted — these run once per field, not once per call. */
const NON_SLUG = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-|-$/g;

/** Matches Product.details[].key, which the model slugifies the same way. */
const COLOUR_KEY = "colour";

export const MAX_TITLE = 200;
export const MAX_SHORT_DESCRIPTION = 300;
export const MAX_INTERNAL_NOTES = 2000;

/** "Rust Orange Chanderi Silk Saree" → "rust-orange-chanderi-silk-saree" */
export function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(NON_SLUG, "-")
    .replace(EDGE_DASHES, "");
}

/**
 * Rupees in the UI, integer paise in the database — the rule the whole app
 * runs on (models/README.md). Returns null for blank, which is how an optional
 * price is stored.
 */
export function toPaise(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const rupees = Number(raw);
  if (!Number.isFinite(rupees) || rupees < 0) return null;

  // Round rather than truncate: 149.99 * 100 is 14998.999... in binary float,
  // and truncating would quietly shave a paisa off every other price.
  return Math.round(rupees * 100);
}

/** Paise back to the rupee string the form shows. */
export function toRupeeInput(paise) {
  if (paise == null) return "";

  const rupees = paise / 100;
  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
}

/** An unchecked checkbox sends nothing at all, so absence is false. */
function toBoolean(formData, name) {
  return formData.get(name) != null;
}

function toNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function toText(value, max) {
  const text = String(value ?? "").trim();
  return max ? text.slice(0, max) : text;
}

/** ChipsInput and the image list both post one JSON field rather than repeated
 *  names, so every array is decoded the same way. */
function toArray(formData, name) {
  try {
    const parsed = JSON.parse(String(formData.get(name) ?? "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toStringArray(formData, name) {
  return toArray(formData, name)
    .map((item) => String(item).trim())
    .filter(Boolean);
}

/**
 * Images arrive as whatever the uploader put in its hidden field, so every
 * property is rebuilt here rather than trusted. Exactly one isFeatured — the
 * model would fix this itself, but doing it here keeps what we send and what
 * gets stored identical.
 */
function toImages(formData) {
  return toArray(formData, "images")
    .filter((image) => image && typeof image.url === "string" && image.url)
    .map((image, index) => ({
      url: String(image.url),
      alt: toText(image.alt, 200),
      position: index,
      isFeatured: index === 0,
    }));
}

/**
 * The spec rows under the description. The colour field is one of these — the
 * schema stores a colour *name*, not a swatch — so it is merged in here and
 * always sorts first.
 */
function toDetails(formData) {
  const rows = toArray(formData, "details")
    .map((row) => ({
      label: toText(row?.label, 60),
      value: toText(row?.value, 300),
    }))
    .filter((row) => row.label && row.value);

  const colour = toText(formData.get("colour"), 100);
  if (colour) {
    // Replace rather than duplicate, in case someone also typed a Colour row.
    const withoutExisting = rows.filter(
      (row) => slugify(row.label) !== COLOUR_KEY
    );
    withoutExisting.unshift({ label: "Colour", value: colour });
    return withPositions(withoutExisting);
  }

  return withPositions(rows);
}

function withPositions(rows) {
  return rows.map((row, index) => ({ ...row, position: index }));
}

/** The Colour spec row, for seeding the form's dedicated colour input. */
export function pickColour(details) {
  const row = (details ?? []).find((item) => item.key === COLOUR_KEY);
  return row?.value ?? "";
}

/** Everything except Colour, which has its own field. */
export function withoutColour(details) {
  return (details ?? []).filter((item) => item.key !== COLOUR_KEY);
}

function pickEnum(value, allowed, fallback) {
  const candidate = String(value ?? "");
  return allowed.includes(candidate) ? candidate : fallback;
}

/**
 * → `{ errors }` when anything is wrong, or `{ values }` ready for the model.
 *
 * Every problem is collected before returning, not just the first: making
 * somebody fix a form one field per round trip is the reason people give up
 * halfway through.
 *
 * `slug` and `sku` are absent by design — both are generated in the action.
 * They are the two fields most likely to be typed wrong, and a duplicate of
 * either is a hard database failure rather than a warning.
 *
 * `category` is not read either: it is implied by the subcategory, and asking
 * for both would let the two disagree.
 */
export function parseProductForm(formData) {
  const errors = {};

  const title = toText(formData.get("title"), MAX_TITLE);
  if (!title) {
    errors.title = "Give the product a name.";
  } else if (!slugify(title)) {
    // Punctuation only — there would be no web address to put it at.
    errors.title = "The name needs at least one letter or number.";
  }

  const subcategory = toText(formData.get("subcategory"));
  if (!subcategory) errors.subcategory = "Choose a category.";

  const description = toText(formData.get("description"));
  if (!description) errors.description = "Add a description.";

  const images = toImages(formData);
  if (images.length === 0) {
    errors.images = "Add at least one photo.";
  } else if (images.length > MAX_PRODUCT_IMAGES) {
    // The picker already stops at the cap; this catches a hand-posted payload.
    errors.images = `A product can have at most ${MAX_PRODUCT_IMAGES} photos.`;
  }

  const price = toPaise(formData.get("price"));
  if (price == null) errors.price = "Enter a retail price.";

  const compareAtPrice = toPaise(formData.get("compareAtPrice"));
  if (compareAtPrice != null && price != null && compareAtPrice < price) {
    // It is the struck-through "was" price, so below the selling price it
    // would render as a price rise.
    errors.compareAtPrice = "MRP must be higher than the retail price.";
  }

  const fulfillment = pickEnum(
    formData.get("fulfillment"),
    FULFILLMENT_VALUES,
    FULFILLMENT.IN_STOCK
  );
  const madeToOrder = fulfillment === FULFILLMENT.MADE_TO_ORDER;

  const taxable = toBoolean(formData, "taxable");
  // A made-to-order piece is woven on demand: nothing to count, and it never
  // goes in the gift box. The form hides both; this is the rule.
  const trackInventory = !madeToOrder && toBoolean(formData, "trackInventory");
  const isGiftable = toBoolean(formData, "isGiftable");

  /**
   * Opening stock is NOT part of the product document — quantities live in
   * Inventory. It is returned alongside so the action can hand it to the stock
   * ledger, which is the only thing allowed to write a quantity.
   */
  const stock = toNumber(formData.get("stockQuantity"));
  if (trackInventory && stock != null && stock > 100000) {
    errors.stockQuantity = "That looks like a typo.";
  }

  if (Object.keys(errors).length > 0) return { errors };

  return {
    openingStock: trackInventory ? (stock ?? 0) : 0,
    values: {
      fulfillment,
      title,
      subcategory,
      type: toText(formData.get("type"), 80),
      tags: toStringArray(formData, "tags"),
      suggestedOccasions: toStringArray(formData, "suggestedOccasions"),

      description,
      shortDescription: toText(
        formData.get("shortDescription"),
        MAX_SHORT_DESCRIPTION
      ),
      details: toDetails(formData),
      images,

      price,
      compareAtPrice,
      costPrice: toPaise(formData.get("costPrice")),
      currency: "INR",
      taxable,
      // The tax inputs only exist while "Taxable" is ticked, so an untaxed
      // product resets to the defaults rather than keeping a stale GST class.
      taxClass: taxable
        ? pickEnum(formData.get("taxClass"), TAX_CLASS_VALUES, TAX_CLASS.GST_5)
        : TAX_CLASS.GST_5,
      hsnCode: taxable ? toText(formData.get("hsnCode"), 20) : "",

      // Variants are a later pass. Product-level sku and price stay
      // authoritative, which is what the pre-validate hook expects.
      hasVariants: false,

      trackInventory,
      // Both are meaningless with nothing being counted, and their inputs are
      // hidden in that case.
      allowBackorder: trackInventory && toBoolean(formData, "allowBackorder"),
      lowStockThreshold: trackInventory
        ? (toNumber(formData.get("lowStockThreshold")) ?? 5)
        : 5,

      weight: toNumber(formData.get("weight")),

      isGiftable,
      allowGiftMessage: isGiftable && toBoolean(formData, "allowGiftMessage"),
      giftWrapAvailable: isGiftable && toBoolean(formData, "giftWrapAvailable"),
      giftBoxCompatible:
        !madeToOrder && isGiftable && toBoolean(formData, "giftBoxCompatible"),

      internalNotes: toText(formData.get("internalNotes"), MAX_INTERNAL_NOTES),
      status: pickEnum(
        formData.get("status"),
        [PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        PRODUCT_STATUS.DRAFT
      ),
    },
  };
}
