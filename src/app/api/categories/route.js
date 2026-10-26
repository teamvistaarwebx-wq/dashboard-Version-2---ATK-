import { getCategories } from "@/features/catalog/queries/get-categories";
import { ok, serverError } from "@/lib/api-response";

/**
 * GET /api/categories?include=subcategories
 * Public read — powers the storefront category tabs and filter chips.
 */
export async function GET(request) {
  try {
    const includeSubcategories =
      request.nextUrl.searchParams.get("include") === "subcategories";

    const categories = await getCategories({ includeSubcategories });
    return ok(categories);
  } catch (error) {
    console.error("GET /api/categories failed:", error);
    return serverError("Could not load categories");
  }
}
