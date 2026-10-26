import { createMadeToOrderInquiry } from "@/features/inquiries/queries/create-made-to-order-inquiry";
import {
  MAX_MADE_TO_ORDER_LINES,
  MAX_MADE_TO_ORDER_UNITS,
  MIN_MADE_TO_ORDER_UNITS,
} from "@/constants/made-to-order";
import { isInternalRequest, unauthorized } from "@/lib/internal-auth";
import { isValidPhone, normalizePhone } from "@/lib/otp";
import { ok, badRequest, serverError } from "@/lib/api-response";

/**
 * POST /api/inquiries/made-to-order — the storefront's quote box.
 *
 * Its own route rather than a flag on /api/inquiries: that one validates a
 * gift box and requires a company, this one takes made-to-order pieces and
 * does not. Mixing the two would turn both validators into a tangle of ifs.
 *
 * Takes `items` — ids and quantities — and text. Prices are read from the
 * catalog. The older single-product shape (`productId` + `quantity`) is still
 * read as a one-line box, so a storefront deployed behind this keeps working.
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
    const result = await createMadeToOrderInquiry({
      items: readItems(body).map((item) => ({
        productId: String(item.productId),
        quantity: item.quantity,
      })),
      contact: body.contact,
      notes: body.notes ?? "",
      customerId: body.customerId ?? null,
    });

    if (result.error) return badRequest(result.error);

    return ok(result);
  } catch (error) {
    console.error("POST /api/inquiries/made-to-order failed:", error);
    return serverError("Could not send your request");
  }
}

/** `items`, or the single-product shape read as one line. */
function readItems(body) {
  if (Array.isArray(body.items)) return body.items;
  if (body.productId) return [{ productId: body.productId, quantity: body.quantity }];
  return [];
}

/** Shape only — enough to call someone back about real quantities. */
function validate(body) {
  if (!body || typeof body !== "object") return "Missing body";

  const items = readItems(body);
  if (items.length === 0) return "Choose a product to request a quote for";
  if (items.length > MAX_MADE_TO_ORDER_LINES) {
    return `A quote can cover up to ${MAX_MADE_TO_ORDER_LINES} products`;
  }

  for (const item of items) {
    if (!item?.productId) return "Choose a product to request a quote for";

    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < MIN_MADE_TO_ORDER_UNITS ||
      item.quantity > MAX_MADE_TO_ORDER_UNITS
    ) {
      return `Quantity must be between ${MIN_MADE_TO_ORDER_UNITS} and ${MAX_MADE_TO_ORDER_UNITS}`;
    }
  }

  const c = body.contact ?? {};
  if (!c.fullName?.trim() || c.fullName.trim().length < 2) {
    return "Full name is required";
  }
  if (!c.email || !/^\S+@\S+\.\S+$/.test(c.email)) {
    return "Valid email is required";
  }
  // A number the team can actually ring — the whole point of the request.
  if (!isValidPhone(normalizePhone(c.phone))) {
    return "Valid 10-digit mobile number is required";
  }

  return null;
}
