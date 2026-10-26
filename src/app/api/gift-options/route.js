import { getGiftOptions } from "@/features/catalog/queries/get-gift-options";
import { ok, serverError } from "@/lib/api-response";

/**
 * GET /api/gift-options[?type=packaging|card-design]
 *
 * Public read for the cart's "Packaging & Card" section. Always returns both
 * groups so one request fills the whole section; `type` narrows it when a
 * caller only needs one.
 */
export async function GET(request) {
  try {
    const type = request.nextUrl.searchParams.get("type") ?? "";
    const options = await getGiftOptions(type);
    return ok(options);
  } catch (error) {
    console.error("GET /api/gift-options failed:", error);
    return serverError("Could not load gift options");
  }
}
