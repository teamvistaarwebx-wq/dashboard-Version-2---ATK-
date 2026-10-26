"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDb } from "@/db/connect";
import { GiftOption } from "@/models/gift-option.model";
import { revalidateStorefront } from "@/lib/revalidate-storefront";
import { requireAdmin } from "@/lib/auth/dal";

/**
 * The list's row buttons: show / hide an option, or make it the default.
 *
 * There is no delete. Orders and enquiries keep their own copy of the name,
 * image and price, so a delete would lose nothing they need — but hiding
 * does the same job, can be undone, and keeps the slug and the history.
 *
 * Load + save() throughout, so the model's one-default hook runs.
 * Authorised in here — a server action is a public endpoint.
 */
export async function setGiftOptionActive(id, nextActive) {
  const loaded = await load(id);
  if (loaded.error) return loaded;

  const { option } = loaded;

  if (!nextActive && option.isDefault) {
    return { error: "This is the default. Make another option the default first." };
  }

  option.set("isActive", Boolean(nextActive));
  return save(option);
}

export async function makeGiftOptionDefault(id) {
  const loaded = await load(id);
  if (loaded.error) return loaded;

  const { option } = loaded;
  if (option.isDefault) return { ok: true };

  // The model also activates it — a hidden default makes no sense.
  option.set("isDefault", true);
  return save(option);
}

async function load(id) {
  await requireAdmin();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "That option no longer exists." };
  }

  await connectDb();

  const option = await GiftOption.findById(id).catch(() => null);
  if (!option) return { error: "That option no longer exists." };

  return { option };
}

async function save(option) {
  try {
    await option.save();
  } catch (error) {
    // An option saved before a rule tightened can fail validation here.
    if (error?.name === "ValidationError") {
      return { error: "Open this option and complete it first." };
    }
    throw error;
  }

  revalidatePath("/gift-options");
  await revalidateStorefront("gift-options");

  return { ok: true };
}
