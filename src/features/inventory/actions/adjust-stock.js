"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADJUST_REASON_VALUES, POSITIVE_REASONS } from "@/constants/inventory";
import { adjustStock } from "@/features/inventory/lib/stock-ledger";
import { requireAdmin } from "@/lib/auth/dal";

/** A recount that says "we have 400 of these" is a typo, not a delivery. */
const MAX_ADJUSTMENT = 1000;

/**
 * Corrects what is on the shelf.
 *
 * The form asks for a positive quantity and a reason; the sign comes from the
 * reason, not from the person. Asking somebody to type "-3" to record breakage
 * is how you eventually get "+3" recorded instead.
 *
 * Authorised in here, not just behind the page — a server action is a public
 * endpoint (same reasoning as deleteProduct and saveProduct).
 */
export async function adjustStockAction(_prevState, formData) {
  const session = await requireAdmin();

  const productId = String(formData.get("productId") ?? "");
  const sku = String(formData.get("sku") ?? "").trim();
  const warehouse = String(formData.get("warehouse") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 500);

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return { errors: { _form: "That product no longer exists." } };
  }
  if (!sku) return { errors: { _form: "Missing SKU." } };
  if (!ADJUST_REASON_VALUES.includes(reason)) {
    return { errors: { reason: "Choose a reason." } };
  }

  const quantity = Number.parseInt(formData.get("quantity"), 10);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { errors: { quantity: "Enter a quantity of 1 or more." } };
  }
  if (quantity > MAX_ADJUSTMENT) {
    return {
      errors: { quantity: `That looks like a typo — ${MAX_ADJUSTMENT} is the limit.` },
    };
  }

  // Restock and Return add; Damage and Correction take away.
  const delta = POSITIVE_REASONS.includes(reason) ? quantity : -quantity;

  const result = await adjustStock({
    productId,
    sku,
    warehouse: mongoose.Types.ObjectId.isValid(warehouse) ? warehouse : null,
    delta,
    reason,
    note,
    actor: session.adminId,
  });

  if (result.error) return { errors: { quantity: result.error } };

  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  // The products list shows an In Stock / Sold Out pill, and the dashboard
  // counts what needs restocking.
  revalidatePath("/products");
  revalidatePath("/");

  // Going back to the list is what closes the drawer — the ?adjust param goes
  // away and the component unmounts. Same pattern as saveProduct.
  redirect(safeReturnTo(formData.get("returnTo")));
}

/**
 * `returnTo` comes from the browser, and redirect() would happily send someone
 * to another origin. Only a path back into the inventory list is allowed —
 * "//evil.example" included, which is a protocol-relative URL, not a path.
 */
function safeReturnTo(value) {
  const target = String(value ?? "");

  if (!target.startsWith("/inventory") || target.startsWith("//")) {
    return "/inventory";
  }

  return target;
}
