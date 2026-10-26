import { createOrder } from "@/features/orders/queries/create-order";
import { getOrders } from "@/features/orders/queries/get-orders";
import { isInternalRequest, unauthorized } from "@/lib/internal-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

/**
 * GET /api/orders — dashboard list.
 *
 * Internal-only: order data carries names, phones and addresses, so it never
 * answers an unauthenticated request.
 */
export async function GET(request) {
  if (!isInternalRequest(request)) return unauthorized();

  try {
    const params = request.nextUrl.searchParams;

    return ok(
      await getOrders({
        status: params.get("status") ?? "",
        q: params.get("q") ?? "",
        page: params.get("page") ?? "",
        limit: params.get("limit") ?? "",
      })
    );
  } catch (error) {
    console.error("GET /api/orders failed:", error);
    return serverError("Could not load orders");
  }
}

/**
 * POST /api/orders — called by the storefront after OTP passes.
 *
 * Takes ids, quantities and text. Prices come from the catalog, never from
 * the request, so a tampered body buys nothing.
 */
export async function POST(request) {
  if (!isInternalRequest(request)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const invalid = validate(body);
  if (invalid) return badRequest(invalid);

  try {
    const result = await createOrder({
      contact: body.contact,
      address: body.address,
      items: body.items,
      packagingId: body.packagingId ?? "",
      cardDesignId: body.cardDesignId ?? "",
      cardMessage: body.cardMessage ?? "",
      // Optional; verifyCardLogo checks the stored file before it is kept.
      cardLogo: body.cardLogo ?? null,
      customerId: body.customerId ?? null,
      otpToken: body.otpToken ?? "",
      expectedTotal: body.expectedTotal,
      corporate: body.corporate ?? null,
    });

    // Identity failures are 401, not 400 — the request was well-formed.
    if (result.error === "OTP verification required") {
      return Response.json({ error: result.error }, { status: 401 });
    }
    if (result.error) return badRequest(result.error);

    // Nothing was written — the caller re-confirms the new total.
    if (result.priceChanged) {
      return Response.json(
        {
          error: "Prices have changed since you opened the cart.",
          code: "PRICE_CHANGED",
          amounts: result.amounts,
        },
        { status: 409 }
      );
    }

    return ok({
      orderId: String(result.order._id),
      orderNumber: result.order.orderNumber,
      status: result.order.status,
      amounts: result.amounts,
    });
  } catch (error) {
    console.error("POST /api/orders failed:", error);
    return serverError("Could not create order");
  }
}

/** Shape only. Money and identity are decided server-side. */
function validate(body) {
  if (!body || typeof body !== "object") return "Missing body";

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return "Cart is empty";
  }

  for (const item of body.items) {
    if (!item?.id) return "Bad cart item";
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return "Bad cart item quantity";
    }
  }

  const c = body.contact ?? {};
  if (!c.fullName?.trim() || c.fullName.trim().length < 2) {
    return "Full name is required";
  }
  if (!c.email || !/^\S+@\S+\.\S+$/.test(c.email)) {
    return "Valid email is required";
  }
  if (!c.phone) return "Phone is required";

  // Only checked when present: `corporate` is optional, but a corporate
  // order without a company is not a thing the team can act on.
  if (body.corporate) {
    const company = String(body.corporate.companyName ?? "").trim();
    if (company.length < 2) return "Company name is required";
  }

  const a = body.address ?? {};
  if (!a.line1?.trim() || a.line1.trim().length < 5) return "Address is required";
  if (!a.city?.trim()) return "City is required";
  if (!a.state?.trim()) return "State is required";
  if (!/^\d{6}$/.test(String(a.pincode ?? "").trim())) {
    return "Valid 6-digit pincode is required";
  }

  return null;
}
