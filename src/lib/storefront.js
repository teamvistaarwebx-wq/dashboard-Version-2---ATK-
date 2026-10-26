const DEFAULT_STOREFRONT_URL = "http://localhost:3010";

/**
 * Where the storefront lives, for resolving the image paths it stored.
 *
 * Product images are served from the storefront's `public/` and snapshotted
 * onto orders and enquiries as root-relative paths ("/images/products/x.jpg").
 * Rendered as-is in here they would resolve against the admin's own origin,
 * which has no product images — every thumbnail would 404.
 *
 * Derived from STOREFRONT_REVALIDATE_URL when STOREFRONT_URL is unset, so an
 * existing deployment needs no new variable. Set STOREFRONT_URL explicitly
 * once images move to a CDN or the two apps stop sharing a host.
 */
function getStorefrontOrigin() {
  if (process.env.STOREFRONT_URL) {
    return process.env.STOREFRONT_URL.replace(/\/$/, "");
  }

  const revalidateUrl = process.env.STOREFRONT_REVALIDATE_URL;
  if (revalidateUrl) {
    try {
      return new URL(revalidateUrl).origin;
    } catch {
      // Malformed env — fall through to the default rather than crash a page.
    }
  }

  return DEFAULT_STOREFRONT_URL;
}

/**
 * Absolute URL for a stored image path, or null when there is nothing to show.
 *
 * Already-absolute URLs pass through untouched: the snapshot on an old record
 * is whatever the catalog held at the time, and a CDN migration would leave
 * both shapes in the database at once.
 */
export function resolveImageUrl(url) {
  const value = String(url ?? "").trim();
  if (!value) return null;

  if (/^(https?:)?\/\//.test(value) || value.startsWith("data:")) {
    return value;
  }

  return `${getStorefrontOrigin()}${value.startsWith("/") ? "" : "/"}${value}`;
}
