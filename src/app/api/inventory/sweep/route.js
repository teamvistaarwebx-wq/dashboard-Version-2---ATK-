import { connectDb } from "@/db/connect";
import { Order } from "@/models/order.model";
import { ORDER_STATUS } from "@/constants/enums";
import { releaseExpired } from "@/features/inventory/lib/stock-ledger";
import { ok, serverError } from "@/lib/api-response";

/**
 * Frees stock from checkouts that were never paid for.
 *
 * `reserveStock` already sweeps the SKUs it is about to touch, so availability
 * is correct without this. What only this can do is move the abandoned ORDERS
 * to `expired` — the lazy path runs inside somebody else's checkout and has no
 * business rewriting a third party's order.
 *
 * Scheduled from vercel.json every five minutes. Safe to run at any time and
 * safe to run twice: `releaseExpired` only touches reservations that are still
 * active, so a second pass finds nothing.
 */
export const dynamic = "force-dynamic";

/**
 * GET, because that is what Vercel Cron sends. It mutates, which a GET
 * normally should not — the trade is deliberate and the endpoint is behind a
 * secret. POST is exported alongside it for running the sweep by hand.
 */
export async function GET(request) {
  return sweep(request);
}

export async function POST(request) {
  return sweep(request);
}

async function sweep(request) {
  if (!isAuthorised(request)) {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }

  try {
    await connectDb();

    const { released, orderIds } = await releaseExpired();

    // Only orders still waiting to be paid. One that reached `paid` between
    // the sweep starting and this update must not be dragged backwards.
    const expiredOrders = orderIds.length
      ? await Order.updateMany(
          { _id: { $in: orderIds }, status: ORDER_STATUS.PENDING_PAYMENT },
          { $set: { status: ORDER_STATUS.EXPIRED } }
        )
      : { modifiedCount: 0 };

    return ok({
      reservationsReleased: released,
      ordersExpired: expiredOrders.modifiedCount,
    });
  } catch (error) {
    console.error("POST /api/inventory/sweep failed:", error);
    return serverError("Sweep failed");
  }
}

/** Vercel Cron sends this header; a manual run can use the same secret. */
function isAuthorised(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  return request.headers.get("authorization") === `Bearer ${secret}`;
}
