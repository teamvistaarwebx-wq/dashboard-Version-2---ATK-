import { LOGO_KEY_PATTERN } from "@/constants/media";
import { badRequest, serverError } from "@/lib/api-response";
import { getSession } from "@/lib/auth/session";
import { signLogoRead } from "@/lib/r2";

/**
 * GET /api/card-logos?key=<key>[&download=1&name=<file name>]
 *
 * Redirects a signed-in admin to a freshly signed read URL for one corporate
 * logo in the private uploads bucket.
 *
 * A redirect rather than a URL baked into the page: a signed URL expires,
 * and an order page left open over lunch would show a broken image. This
 * mints one per view instead, and the <img> or the download link follows it.
 *
 * getSession rather than requireAdmin, for the same reason as the upload
 * routes — a 401 is the honest answer, not a redirect to /login.
 */
export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const key = params.get("key") ?? "";

  // Only keys this app mints — this must not become a reader for the whole
  // bucket.
  if (!LOGO_KEY_PATTERN.test(key)) return badRequest("Unknown logo");

  try {
    const url = await signLogoRead(key, {
      download: params.get("download") === "1",
      fileName: params.get("name") ?? "",
    });

    return new Response(null, {
      status: 302,
      headers: { Location: url, "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("GET /api/card-logos failed:", error);
    return serverError("Could not open the logo");
  }
}
