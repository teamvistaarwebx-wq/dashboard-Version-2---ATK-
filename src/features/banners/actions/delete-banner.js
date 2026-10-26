"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDb } from "@/db/connect";
import { Banner } from "@/models/banner.model";
import { CATALOG_DESTRUCTIVE_ROLES } from "@/constants/enums";
import { requireAdmin } from "@/lib/auth/dal";

/**
 * Removes a banner for good.
 *
 * A real delete, unlike deleteProduct's soft one: nothing holds a banner id —
 * no order, no enquiry, no stock movement — so there is no history to keep
 * intact, and a bin full of last year's festival artwork helps nobody.
 *
 * Role-gated to match product deletion, and checked in here rather than only
 * hidden in the UI — a server action is a public endpoint.
 */
export async function deleteBanner(id) {
  const session = await requireAdmin();

  if (!CATALOG_DESTRUCTIVE_ROLES.includes(session.role)) {
    return { error: "Your account cannot remove banners." };
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "That banner no longer exists." };
  }

  await connectDb();

  /**
   * The live banner is not deletable in one step. Taking the home page's hero
   * away is a decision worth making on its own screen, not a side effect of
   * tidying up a list — unpublish first, then delete.
   */
  const banner = await Banner.findById(id).select("isActive").lean();
  if (!banner) return { error: "That banner no longer exists." };

  if (banner.isActive) {
    return { error: "Unpublish this banner before deleting it." };
  }

  await Banner.deleteOne({ _id: id, isActive: false });

  revalidatePath("/banners");
  // The R2 objects are deliberately left in place: an unpublish/delete done
  // by mistake is recoverable while the artwork still exists, and a bucket
  // sweep is a cheaper thing to get wrong than a live delete.

  return { ok: true };
}
