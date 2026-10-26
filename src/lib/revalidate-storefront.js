/**
 * Tells the storefront to drop a cached read of ours.
 *
 * The storefront caches its admin reads with `next: { tags: [...] }` and a
 * revalidate window — 60s for the banner. Without this ping, publishing a
 * banner would take up to a minute to appear, which reads as "it didn't
 * save" to whoever just pressed the button.
 *
 * Best-effort on purpose: the write has already happened and the cache will
 * expire on its own. A storefront that is down, redeploying, or simply not
 * running in local development must not turn a successful save into an error.
 */
export async function revalidateStorefront(tags) {
  const endpoint = process.env.STOREFRONT_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!endpoint || !secret) {
    console.warn(
      "[revalidate] STOREFRONT_REVALIDATE_URL or REVALIDATE_SECRET is not set — skipping"
    );
    return false;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ tags: Array.isArray(tags) ? tags : [tags] }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`[revalidate] storefront answered ${res.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[revalidate] storefront unreachable", error);
    return false;
  }
}
