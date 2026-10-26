import { getProducts } from "@/features/catalog/queries/get-products";
import { ok, serverError } from "@/lib/api-response";

/**
 * GET /api/products?category=&subcategory=&q=&sort=&page=&limit=&fulfillment=
 * Public read — only active, non-deleted products, trimmed to card fields.
 * `fulfillment=made_to_order` lists the made-to-order catalogue instead of
 * the in-stock one; never both.
 */
export async function GET(request) {
  try {
    const params = request.nextUrl.searchParams;

    const result = await getProducts({
      category: params.get("category") ?? "",
      subcategory: params.get("subcategory") ?? "",
      q: params.get("q") ?? "",
      sort: params.get("sort") ?? "",
      page: params.get("page") ?? "",
      limit: params.get("limit") ?? "",
      minPrice: params.get("minPrice"),
      maxPrice: params.get("maxPrice"),
      fulfillment: params.get("fulfillment") ?? "",
    });

    return ok(result);
  } catch (error) {
    console.error("GET /api/products failed:", error);
    return serverError("Could not load products");
  }
}
