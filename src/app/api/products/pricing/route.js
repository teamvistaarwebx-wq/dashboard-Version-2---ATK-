import { getPricing } from "@/features/catalog/queries/get-pricing";
import { ok, badRequest, serverError } from "@/lib/api-response";

/** Matches the cart's practical ceiling. */
const MAX_IDS = 50;

/**
 * GET /api/products/pricing?ids=<a,b,c>
 *
 * Authoritative prices for the order path. Never cached — a stale price here
 * would be charged to a real card.
 */
export async function GET(request) {
  try {
    const ids = (request.nextUrl.searchParams.get("ids") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, MAX_IDS);

    if (ids.length === 0) {
      return badRequest("Pass at least one product id via ?ids=");
    }

    return ok(await getPricing(ids));
  } catch (error) {
    console.error("GET /api/products/pricing failed:", error);
    return serverError("Could not load pricing");
  }
}
