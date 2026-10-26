"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDb } from "@/db/connect";
import { Banner } from "@/models/banner.model";
import { revalidateStorefront } from "@/lib/revalidate-storefront";
import { requireAdmin } from "@/lib/auth/dal";

/**
 * Puts one banner live, or takes the live one down.
 *
 * Publishing is its own action rather than a checkbox on the form: it is the
 * one banner operation that changes the storefront immediately, and staff do
 * it from the list far more often than they edit artwork.
 *
 * Authorised in here — a server action is a public endpoint.
 */
export async function publishBanner(id, nextActive) {
  const session = await requireAdmin();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "That banner no longer exists." };
  }

  await connectDb();

  const banner = await Banner.findById(id).catch(() => null);
  if (!banner) return { error: "That banner no longer exists." };

  /**
   * Loaded and saved so `pre("save")` runs — it is what deactivates the other
   * banners. Setting the flag through an update query would leave two live at
   * once (see the same note in save-banner.js).
   */
  banner.set("isActive", Boolean(nextActive));
  banner.set("updatedBy", session.adminId);

  try {
    await banner.save();
  } catch (error) {
    // A banner saved before a rule tightened can fail validation on the way
    // back out. Say so rather than throwing into the error boundary — the
    // fix is to open it and fill in what's missing.
    if (error?.name === "ValidationError") {
      return { error: "Open this banner and complete it before publishing." };
    }
    throw error;
  }

  revalidatePath("/banners");
  // Either direction changes the home page: one swaps the hero, the other
  // drops the storefront back to its bundled fallback.
  await revalidateStorefront("banners");

  return { ok: true };
}
