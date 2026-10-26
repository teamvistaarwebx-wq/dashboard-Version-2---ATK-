import { GIFT_OPTION_TYPE } from "@/constants/enums";
import { slugify, toPaise } from "@/features/catalog/lib/product-input";

/**
 * Turns the gift option form into model values, or messages keyed by field.
 *
 * Rupees in the form, integer paise in the database — the rule the whole app
 * runs on. `type` is not read from the form on an edit: switching a card
 * design into packaging would leave the wrong fields behind, so the caller
 * passes the stored type in.
 */
const MAX_NAME = 80;
const MAX_SLUG = 80;
const MAX_DESCRIPTION = 300;

/** ₹1,00,000. Generous for a box or a card; catches a slipped extra zero. */
const MAX_PRICE_PAISE = 100_000 * 100;

const MAX_POSITION = 999;

/** Mirrors the storefront's FALLBACK_MESSAGE_LENGTH and priceBox's default. */
export const DEFAULT_MESSAGE_LENGTH = 200;
const MIN_MESSAGE_LENGTH = 20;
const MAX_MESSAGE_LENGTH = 500;

const MAX_CAPACITY = 100;

export function parseGiftOptionForm(formData, { type, previousImage = "" }) {
  const errors = {};

  const name = String(formData.get("name") ?? "").trim().slice(0, MAX_NAME);
  if (name.length < 2) errors.name = "Give it a name shoppers will recognise.";

  // Blank means "from the name", which is what most people want.
  const slug = slugify(formData.get("slug") || name).slice(0, MAX_SLUG);
  if (!slug) errors.slug = "Use letters or numbers in the slug.";

  const description = String(formData.get("description") ?? "")
    .trim()
    .slice(0, MAX_DESCRIPTION);

  const priceInput = String(formData.get("price") ?? "").trim();
  const price = priceInput === "" ? 0 : toPaise(priceInput);
  if (price === null) {
    errors.price = "Enter a price in rupees, like 149 or 149.50 — or 0 for free.";
  } else if (price > MAX_PRICE_PAISE) {
    errors.price = "That price looks too high — check for an extra zero.";
  }

  const order = toWholeNumber(formData.get("order"), 0);
  if (order === null || order < 0 || order > MAX_POSITION) {
    errors.order = `Use a whole number from 0 to ${MAX_POSITION}.`;
  }

  const image = String(formData.get("image") ?? "").trim();
  if (!image) {
    errors.image = "Upload an image — without one the cart shows an empty tile.";
  } else if (image !== previousImage && !isAllowedImage(image)) {
    // An image saved before this screen existed is left alone; anything new
    // must be somewhere the storefront's next/image can load it from.
    errors.image = "Upload the image here rather than pasting a link.";
  }

  const values = {
    name,
    slug,
    description,
    price: price ?? 0,
    order: order ?? 0,
    image,
    isActive: formData.get("isActive") === "on",
    isDefault: formData.get("isDefault") === "on",
  };

  if (type === GIFT_OPTION_TYPE.CARD_DESIGN) {
    const limit = toWholeNumber(formData.get("maxMessageLength"), DEFAULT_MESSAGE_LENGTH);
    if (limit === null || limit < MIN_MESSAGE_LENGTH || limit > MAX_MESSAGE_LENGTH) {
      errors.maxMessageLength = `Use a whole number from ${MIN_MESSAGE_LENGTH} to ${MAX_MESSAGE_LENGTH}.`;
    }
    values.maxMessageLength = limit ?? DEFAULT_MESSAGE_LENGTH;
  } else {
    // Optional: blank means "not tracked".
    const capacity = toWholeNumber(formData.get("capacity"), undefined);
    if (capacity === null || (capacity !== undefined && (capacity < 1 || capacity > MAX_CAPACITY))) {
      errors.capacity = `Leave blank, or use a whole number from 1 to ${MAX_CAPACITY}.`;
    }
    values.capacity = capacity ?? undefined;
  }

  if (Object.keys(errors).length > 0) return { errors };
  return { values };
}

/**
 * The public R2 bucket, where this form's uploader puts files, or a path the
 * storefront serves from its own /public — the only two places the cart's
 * next/image will load from.
 */
function isAllowedImage(url) {
  if (url.startsWith("/") && !url.startsWith("//")) return true;

  const base = String(process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  return Boolean(base) && url.startsWith(`${base}/`);
}

/** Blank → `fallback`; not a whole number → null. */
function toWholeNumber(value, fallback) {
  const raw = String(value ?? "").trim();
  if (raw === "") return fallback;

  const number = Number(raw);
  return Number.isInteger(number) ? number : null;
}
