import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
} from "@/constants/media";
import { badRequest, ok, serverError } from "@/lib/api-response";
import { getSession } from "@/lib/auth/session";
import { presignProductImageUpload } from "@/lib/r2";

/**
 * POST /api/uploads/product-image  →  { uploadUrl, publicUrl, key }
 *
 * Mints a short-lived URL the browser PUTs one photo to, straight to R2. The
 * bytes never touch this server: a server action would cap the body at 1MB
 * (Next's default) and raising that would still stream every photo through
 * this process.
 *
 * Authenticated like everything else — without the session check this is a
 * public endpoint for minting writes into the bucket.
 */
export async function POST(request) {
  try {
    /**
     * getSession, not requireAdmin: requireAdmin answers a signed-out caller
     * with redirect("/login"), which fetch() would follow and hand the
     * uploader a page of HTML where it expected JSON. A 401 is the honest
     * answer for a JSON endpoint.
     */
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return badRequest("Expected a JSON body");

    const contentType = String(body.contentType ?? "");
    if (!ALLOWED_IMAGE_TYPES[contentType]) {
      return badRequest(
        `Unsupported image type. Use ${Object.keys(ALLOWED_IMAGE_TYPES).join(", ")}.`
      );
    }

    // Advisory: a presigned PUT cannot enforce this, so it only catches an
    // honest client. The real guard is the type pinned into the signature.
    const size = Number(body.size);
    if (Number.isFinite(size) && size > MAX_IMAGE_BYTES) {
      return badRequest(`That image is too large. Keep it under ${MAX_IMAGE_MB}MB.`);
    }

    return ok(await presignProductImageUpload({ contentType }));
  } catch (error) {
    console.error("POST /api/uploads/product-image failed:", error);
    // A missing R2_* variable lands here — say so without leaking which one.
    return serverError("Could not start the upload");
  }
}
