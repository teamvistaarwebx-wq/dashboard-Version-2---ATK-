"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDb } from "@/db/connect";
import { Product } from "@/models/product.model";
import { CATALOG_DESTRUCTIVE_ROLES } from "@/constants/enums";
import { requireAdmin } from "@/lib/auth/dal";

/**
 * Removes a product from the catalogue.
 *
 * Soft, not a real delete: orders, enquiries and stock movements all hold this
 * id, and every storefront query already filters on `isDeleted`. Dropping the
 * document would leave those rows pointing at nothing, and an order from six
 * weeks ago is a record, not a live catalogue read.
 *
 * Authorised in here rather than only behind the page — a server action is a
 * public endpoint and can be called directly (same reasoning as
 * inviteAdminUser and updateInquiry).
 */
export async function deleteProduct(id) {
  const session = await requireAdmin();

  if (!CATALOG_DESTRUCTIVE_ROLES.includes(session.role)) {
    return { error: "Your account cannot remove products." };
  }

  // Checked before the connection: an invalid id makes findOneAndUpdate throw
  // a cast error, and there is nothing to look up anyway.
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "That product no longer exists." };
  }

  await connectDb();

  /**
   * findOneAndUpdate rather than load-and-save: the pre-validate hook rebuilds
   * details, re-picks the featured image and insists on a sku and a price.
   * Marking a row deleted must not depend on it still passing rules it may
   * predate.
   *
   * `isDeleted: false` in the filter makes a double click idempotent — the
   * second one finds nothing and says so.
   */
  const deleted = await Product.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true, updatedBy: session.adminId } },
    { new: true, projection: { _id: 1 } }
  ).catch(() => null);

  if (!deleted) return { error: "That product no longer exists." };

  revalidatePath("/products");
  revalidatePath("/made-to-order");
  // The dashboard counts catalogue size and stock per subcategory.
  revalidatePath("/");

  return { ok: true };
}
