import { getProduct } from "@/features/catalog/queries/get-product";
import { ok, serverError } from "@/lib/api-response";

/**
 * GET /api/products/:idOrSlug
 *
 * Public read for the storefront product detail page. Accepts either the
 * slug (how the storefront routes) or an ObjectId (admin preview).
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const product = await getProduct(id);

    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return ok(product);
  } catch (error) {
    console.error("GET /api/products/[id] failed:", error);
    return serverError("Could not load product");
  }
}
