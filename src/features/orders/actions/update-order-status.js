"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDb } from "@/db/connect";
import { Order } from "@/models/order.model";
import { ORDER_STATUS } from "@/constants/enums";
import {
  ORDER_TRANSITIONS,
  STOCK_CONSUMED_STATUSES,
} from "@/constants/inventory";
import {
  consumeReservations,
  releaseReservations,
  restockOrder,
} from "@/features/inventory/lib/stock-ledger";
import { requireAdmin } from "@/lib/auth/dal";

/**
 * Moves an order along, and moves the stock with it.
 *
 * This is the only place an order's status changes, so it is also the only
 * place stock leaves or returns because of one. The transition table in
 * constants/inventory.js is enforced here rather than by which buttons happen
 * to be on screen — a server action is a public endpoint, and
 * `delivered → pending_payment` would otherwise be one crafted request away.
 *
 * When Razorpay is wired, its webhook calls this same function with
 * `ORDER_STATUS.PAID`. The stock behaviour must not depend on whether a person
 * or a payment provider triggered it.
 */
export async function updateOrderStatus(_prevState, formData) {
  const session = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("status") ?? "");

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "That order no longer exists." };
  }

  await connectDb();

  const order = await Order.findById(id)
    .select("status items needsReview")
    .lean();

  if (!order) return { error: "That order no longer exists." };

  // Someone else already moved it — say so rather than applying a transition
  // that was valid when the page was rendered and is not any more.
  if (order.status === next) return { ok: true };

  const allowed = ORDER_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(next)) {
    return {
      error: `An order that is ${label(order.status)} cannot become ${label(next)}.`,
    };
  }

  const wasConsumed = STOCK_CONSUMED_STATUSES.includes(order.status);
  const update = { status: next };

  /**
   * Stock first, status second.
   *
   * If the ledger throws, the order keeps its old status and the operation can
   * be retried. The other order would leave an order marked paid whose stock
   * was never taken — the one state nobody could reconcile afterwards.
   */
  if (next === ORDER_STATUS.PAID) {
    const { oversold } = await consumeReservations({
      orderId: id,
      actor: session.adminId,
    });

    // The hold had expired and the stock may have gone to somebody else. Take
    // the money, flag it, and let a person ring the customer.
    if (oversold.length > 0) {
      update.needsReview = true;
      update.reviewNote = `Paid after the stock hold expired. Check availability for ${oversold.join(", ")}.`;
    }
  } else if (next === ORDER_STATUS.CANCELLED && wasConsumed) {
    // The sale really happened, so it is logged as a return rather than by
    // rewriting history to pretend it did not.
    await restockOrder({
      orderId: id,
      items: order.items,
      actor: session.adminId,
    });
  } else if (
    next === ORDER_STATUS.CANCELLED ||
    next === ORDER_STATUS.EXPIRED ||
    next === ORDER_STATUS.PAYMENT_FAILED
  ) {
    // Never paid — the hold simply goes back on the shelf, no movement.
    await releaseReservations({ orderId: id });
  }

  await Order.updateOne({ _id: id, status: order.status }, { $set: update });

  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/inventory");
  revalidatePath("/");

  return { ok: true };
}

/** Clears the flag once somebody has actually dealt with it. */
export async function resolveOrderReview(_prevState, formData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "That order no longer exists." };
  }

  await connectDb();
  await Order.updateOne(
    { _id: id },
    { $set: { needsReview: false, reviewNote: "" } }
  );

  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");

  return { ok: true };
}

function label(status) {
  return String(status).replace(/_/g, " ");
}
