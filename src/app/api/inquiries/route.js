import { createInquiry } from "@/features/inquiries/queries/create-inquiry";
import { isInternalRequest, unauthorized } from "@/lib/internal-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

/**
 * POST /api/inquiries — called by the storefront's Request a Quote path.
 *
 * No GET: the dashboard runs inside the app that owns the model and calls
 * `getInquiries` directly, so a list endpoint would be dead code.
 *
 * Like orders, this takes ids, quantities and text; the box is priced from
 * the catalog. Unlike orders, it demands no OTP — see create-inquiry.js.
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
    const result = await createInquiry({
      contact: body.contact,
      address: body.address ?? {},
      items: body.items,
      packagingId: body.packagingId ?? "",
      cardDesignId: body.cardDesignId ?? "",
      cardMessage: body.cardMessage ?? "",
      // Optional; verifyCardLogo checks the stored file before it is kept.
      cardLogo: body.cardLogo ?? null,
      customerId: body.customerId ?? null,
      corporate: body.corporate ?? null,
    });

    if (result.error) return badRequest(result.error);

    return ok(result);
  } catch (error) {
    console.error("POST /api/inquiries failed:", error);
    return serverError("Could not send your enquiry");
  }
}

/**
 * Shape only. Money is decided server-side.
 *
 * Looser than the order validator on purpose: no card message is required,
 * and the address is optional so this route stays usable if a shorter
 * enquiry form is ever added. What it does insist on is enough to call
 * someone back — a name, a company, a phone and something they liked.
 */
function validate(body) {
  if (!body || typeof body !== "object") return "Missing body";

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return "Add at least one product before sending an enquiry";
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

  // An enquiry IS the corporate path — unlike an order, there is no
  // individual variant of it, so the block is required rather than optional.
  const company = String(body.corporate?.companyName ?? "").trim();
  if (company.length < 2) return "Company name is required";

  // Address is optional, but a half-filled one is worse than none: it would
  // read on the dashboard as a delivery target nobody confirmed.
  const a = body.address ?? {};
  const given = [a.line1, a.city, a.state, a.pincode].filter((value) =>
    String(value ?? "").trim()
  );
  if (given.length > 0) {
    if (!a.line1?.trim() || a.line1.trim().length < 5) {
      return "Address is required";
    }
    if (!a.city?.trim()) return "City is required";
    if (!a.state?.trim()) return "State is required";
    if (!/^\d{6}$/.test(String(a.pincode ?? "").trim())) {
      return "Valid 6-digit pincode is required";
    }
  }

  return null;
}
