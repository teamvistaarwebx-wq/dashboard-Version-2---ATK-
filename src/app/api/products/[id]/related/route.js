import { getRelatedProducts } from "@/features/catalog/queries/get-related-products";
import { ok, serverError } from "@/lib/api-response";

const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 12;

/**
 * GET /api/products/:idOrSlug/related?limit=4
 *
 * Substitutes for the product being viewed. Returns the same card shape as
 * the listing endpoint, so the storefront reuses ProductCard unchanged.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const requested = Number.parseInt(
      request.nextUrl.searchParams.get("limit"),
      10
    );
    const limit =
      Number.isFinite(requested) && requested > 0
        ? Math.min(requested, MAX_LIMIT)
        : DEFAULT_LIMIT;

    const items = await getRelatedProducts(id, limit);
    return ok(items);
  } catch (error) {
    console.error("GET /api/products/[id]/related failed:", error);
    return serverError("Could not load related products");
  }
}
