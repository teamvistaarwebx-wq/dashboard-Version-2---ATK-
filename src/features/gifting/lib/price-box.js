import mongoose from "mongoose";
import { GiftOption } from "@/models/gift-option.model";
import { Product } from "@/models/product.model";
import {
  FULFILLMENT,
  GIFT_OPTION_TYPE,
  PRODUCT_STATUS,
} from "@/constants/enums";

/**
 * Prices a gift box from ids and quantities alone.
 *
 * Shared by create-order.js and create-inquiry.js. The caller supplies WHAT
 * is in the box; this decides what it costs. Nothing monetary crossing the
 * network is trusted — true for an enquiry as much as an order, even though
 * an enquiry charges nobody: an "indicative total" the browser could set is
 * worth nothing to the team quoting it.
 */

const DEFAULT_MAX_MESSAGE = 200;

/** Mirrored in the storefront's gift-box store, which caps the same fields. */
export const MAX_COMPANY_NAME = 120;
export const MAX_CORPORATE_NOTES = 1000;

/**
 * `requireMessage` is the one difference between the two callers. Every box
 * we manufacture ships with a printed card, so an order cannot go out blank;
 * an enquiry is a question about a box that does not exist yet.
 */
export async function priceBox(input, { requireMessage = true } = {}) {
  const ids = input.items
    .map((item) => String(item.id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (ids.length !== input.items.length) {
    return { error: "A product in your box is no longer available." };
  }

  // Independent reads — one round trip instead of two.
  const [products, addons] = await Promise.all([
    Product.find({ _id: { $in: ids } })
      // `sku` rides along so the caller can hold stock against the line
      // without a second read — see reserveStock in the stock ledger.
      .select("title slug sku price status isDeleted hasVariants variants.price variants.active images fulfillment")
      .lean(),
    GiftOption.find({ isActive: true })
      .select("type name image price maxMessageLength isDefault order")
      .sort({ order: 1 })
      .lean(),
  ]);

  const productById = new Map(products.map((doc) => [String(doc._id), doc]));

  const items = [];
  let subtotal = 0;

  for (const requested of input.items) {
    const id = String(requested.id);
    const doc = productById.get(id);

    if (!doc) return { error: "A product in your box is no longer available." };

    const sellable =
      doc.status === PRODUCT_STATUS.ACTIVE && doc.isDeleted !== true;
    const price = resolvePrice(doc);

    if (!sellable || price === null) {
      return { error: `"${doc.title}" is no longer available.` };
    }

    // The gift box lives in localStorage, so a made-to-order line can only get
    // here from a tampered box. The UI never offers it; this is the rule.
    if (doc.fulfillment === FULFILLMENT.MADE_TO_ORDER) {
      return {
        error: `"${doc.title}" is made to order — request a quote for it from its own page.`,
      };
    }

    const quantity = Number(requested.quantity);
    subtotal += price * quantity;

    items.push({
      productId: id,
      slug: doc.slug ?? "",
      sku: doc.sku ?? "",
      title: doc.title,
      price,
      quantity,
      image: pickImage(doc.images),
    });
  }

  // Resolve add-ons the same way the cart does: explicit choice, else the
  // admin's default, else the first — so the total matches the screen.
  const packagingOptions = addons.filter(
    (row) => row.type === GIFT_OPTION_TYPE.PACKAGING
  );
  const cardOptions = addons.filter(
    (row) => row.type === GIFT_OPTION_TYPE.CARD_DESIGN
  );

  const packaging = resolveOption(packagingOptions, input.packagingId);
  const card = resolveOption(cardOptions, input.cardDesignId);

  const message = String(input.cardMessage ?? "").trim();
  if (requireMessage && message.length === 0) {
    return { error: "A personalized message is required." };
  }

  // Length is checked whenever there IS a message — an enquiry may skip the
  // card, but it cannot ask for one that doesn't fit.
  const maxLength = card?.maxMessageLength ?? DEFAULT_MAX_MESSAGE;
  if (message.length > maxLength) {
    return {
      error: `Message is too long for this card — ${maxLength} characters max.`,
    };
  }

  const packagingPrice = packaging?.price ?? 0;
  const cardPrice = card?.price ?? 0;
  const shipping = 0;

  return {
    items,
    packaging: toAddon(packaging),
    card: toAddon(card),
    message,
    amounts: {
      subtotal,
      packaging: packagingPrice,
      card: cardPrice,
      shipping,
      total: subtotal + packagingPrice + cardPrice + shipping,
    },
  };
}

/**
 * Rebuilds the corporate block from the request rather than storing it.
 *
 * Returns null when there is no company name — on an Order the field's
 * presence is what marks it corporate, so a blank name must not produce an
 * empty corporate order rather than a personal one.
 *
 * The quota is snapshotted as sent and is NOT enforced against the items. It
 * is descriptive, not monetary: every line is priced from the catalog, so a
 * tampered quota buys nothing it hasn't paid for. The one thing it IS checked
 * for is size — see corporateHeadcount below.
 */
export function buildCorporate(raw) {
  if (!raw || typeof raw !== "object") return null;

  const companyName = String(raw.companyName ?? "")
    .trim()
    .slice(0, MAX_COMPANY_NAME);

  if (!companyName) return null;

  // An unparseable date is dropped rather than rejected — a corporate order
  // with no delivery target is still a valid order the team can chase.
  const parsed = raw.neededBy ? new Date(raw.neededBy) : null;
  const neededBy = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

  const limits = {};
  for (const [category, value] of Object.entries(raw.limits ?? {})) {
    const limit = Number.parseInt(value, 10);
    if (Number.isFinite(limit) && limit > 0) limits[category] = limit;
  }

  return {
    companyName,
    neededBy,
    notes: String(raw.notes ?? "")
      .trim()
      .slice(0, MAX_CORPORATE_NOTES),
    occasion: String(raw.occasion ?? "").trim(),
    limits,
  };
}

/** Total gifts a quota asks for. Zero when there is no corporate block. */
export function corporateHeadcount(corporate) {
  let total = 0;
  for (const value of Object.values(corporate?.limits ?? {})) total += value;
  return total;
}

function resolveOption(options, selectedId) {
  if (options.length === 0) return null;

  return (
    options.find((option) => String(option._id) === String(selectedId)) ??
    options.find((option) => option.isDefault) ??
    options[0]
  );
}

/** Snapshot, so a later rename or reprice can't alter a placed order. */
function toAddon(option) {
  if (!option) return { optionId: "", name: "", image: "", price: 0 };

  return {
    optionId: String(option._id),
    name: option.name,
    image: option.image ?? "",
    price: option.price ?? 0,
  };
}

function resolvePrice(doc) {
  if (!doc.hasVariants) return typeof doc.price === "number" ? doc.price : null;

  let min = Infinity;
  for (const variant of doc.variants ?? []) {
    if (variant.active === false || typeof variant.price !== "number") continue;
    if (variant.price < min) min = variant.price;
  }

  return min === Infinity ? null : min;
}

function pickImage(images) {
  if (!Array.isArray(images) || images.length === 0) {
    return { url: "", alt: "" };
  }

  const featured = images.find((img) => img.isFeatured) ?? images[0];
  return { url: featured.url ?? "", alt: featured.alt ?? "" };
}
