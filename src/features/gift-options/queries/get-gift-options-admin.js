import mongoose from "mongoose";
import { connectDb } from "@/db/connect";
import { GiftOption } from "@/models/gift-option.model";
import { GIFT_OPTION_TYPE } from "@/constants/enums";

/**
 * Gift option reads for the dashboard.
 *
 * Separate from catalog/queries/get-gift-options.js, which serves the
 * storefront and returns active options only. Staff need to see — and bring
 * back — the inactive ones too.
 *
 * No pagination: a handful of packagings and card designs, not a catalogue.
 */
export async function getGiftOptionsForAdmin() {
  await connectDb();

  const docs = await GiftOption.find()
    .sort({ type: 1, order: 1, name: 1 })
    .lean();

  const packaging = [];
  const cardDesigns = [];

  for (const doc of docs) {
    const option = toAdminOption(doc);
    if (doc.type === GIFT_OPTION_TYPE.PACKAGING) packaging.push(option);
    else cardDesigns.push(option);
  }

  return { packaging, cardDesigns };
}

export async function getGiftOptionForAdmin(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;

  await connectDb();

  const doc = await GiftOption.findById(id).lean();
  return doc ? toAdminOption(doc) : null;
}

function toAdminOption(doc) {
  return {
    id: String(doc._id),
    type: doc.type,
    name: doc.name,
    slug: doc.slug,
    image: doc.image || "",
    description: doc.description || "",
    price: doc.price ?? 0,
    order: doc.order ?? 0,
    isActive: Boolean(doc.isActive),
    isDefault: Boolean(doc.isDefault),
    maxMessageLength: doc.maxMessageLength ?? null,
    capacity: doc.capacity ?? null,
    updatedAt: doc.updatedAt ?? null,
  };
}
