import { getOrder } from "@/features/orders/queries/get-orders";
import { isInternalRequest, unauthorized } from "@/lib/internal-auth";
import { ok, serverError } from "@/lib/api-response";

/**
 * GET /api/orders/:idOrNumber
 *
 * Accepts an ObjectId or the human-readable "AKT-2026-483920", so support
 * can look up whatever a customer quotes.
 */
export async function GET(request, { params }) {
  if (!isInternalRequest(request)) return unauthorized();

  try {
    const { id } = await params;
    const order = await getOrder(id);

    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    return ok(order);
  } catch (error) {
    console.error("GET /api/orders/[id] failed:", error);
    return serverError("Could not load order");
  }
}
