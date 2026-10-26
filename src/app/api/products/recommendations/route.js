import { getComplements } from "@/features/catalog/queries/get-complements";
import { ok, badRequest, serverError } from "@/lib/api-response";

const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 12;
/** Guards the URL length and the candidate scoring cost. */
const MAX_IDS = 25;

/**
 * GET /api/products/recommendations?ids=<a,b,c>&limit=4
 *
 * Complements for everything currently in a gift box. Returns the same card
 * shape as the listing, so the cart rail reuses the existing components.
 */
export async function GET(request) {
  try {
    const params = request.nextUrl.searchParams;

    const ids = (params.get("ids") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, MAX_IDS);

    if (ids.length === 0) {
      return badRequest("Pass at least one product id via ?ids=");
    }

    const requested = Number.parseInt(params.get("limit"), 10);
    const limit =
      Number.isFinite(requested) && requested > 0
        ? Math.min(requested, MAX_LIMIT)
        : DEFAULT_LIMIT;

    const items = await getComplements(ids, limit);
    return ok(items);
  } catch (error) {
    console.error("GET /api/products/recommendations failed:", error);
    return serverError("Could not load recommendations");
  }
}
