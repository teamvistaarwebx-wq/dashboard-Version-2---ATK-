import { connectDb } from "@/db/connect";
import { GiftOption } from "@/models/gift-option.model";
import {
  GIFT_OPTION_TYPE,
  GIFT_OPTION_TYPE_VALUES,
} from "@/constants/enums";

/**
 * Packaging and card designs for the gift box.
 *
 * Identical for every shopper and changes rarely, so the storefront renders
 * this on the server and caches it hard.
 */
export async function getGiftOptions(type) {
  await connectDb();

  const filter = { isActive: true };
  if (GIFT_OPTION_TYPE_VALUES.includes(type)) {
    filter.type = type;
  }

  const docs = await GiftOption.find(filter)
    .select("type name slug image description price isDefault maxMessageLength capacity")
    .sort({ type: 1, order: 1, name: 1 })
    .lean();

  const packaging = [];
  const cardDesigns = [];

  for (const doc of docs) {
    if (doc.type === GIFT_OPTION_TYPE.PACKAGING) {
      packaging.push(toPackaging(doc));
    } else {
      cardDesigns.push(toCardDesign(doc));
    }
  }

  return { packaging, cardDesigns };
}

function toBase(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    image: doc.image || "",
    description: doc.description || "",
    price: doc.price ?? 0,
    isDefault: Boolean(doc.isDefault),
  };
}

function toPackaging(doc) {
  return { ...toBase(doc), capacity: doc.capacity ?? null };
}

function toCardDesign(doc) {
  return {
    ...toBase(doc),
    maxMessageLength: doc.maxMessageLength ?? null,
  };
}
