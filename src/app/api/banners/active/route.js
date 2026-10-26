import { getActiveBanner } from "@/features/banners/queries/get-banners";
import { ok, serverError } from "@/lib/api-response";

/**
 * GET /api/banners/active
 *
 * Public, like /api/gift-options — every shopper sees the same hero, so this
 * is cacheable catalog data rather than something to hide behind the internal
 * secret. The storefront caches it for 60s under the `banners` tag and busts
 * that tag when a banner is published.
 *
 * Answers 200 with `data: null` when nothing is live, not 404: "there is no
 * banner" is a valid state the storefront handles by drawing its bundled
 * fallback, and an error status would put a red line in the logs for it.
 */
export async function GET() {
  try {
    return ok(await getActiveBanner());
  } catch (error) {
    console.error("GET /api/banners/active failed:", error);
    return serverError("Could not load the banner");
  }
}
