import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
} from "@/constants/media";
import { badRequest, ok, serverError } from "@/lib/api-response";
import { getSession } from "@/lib/auth/session";
import { presignGiftOptionImageUpload } from "@/lib/r2";

/**
 * POST /api/uploads/gift-option-image  →  { uploadUrl, publicUrl, key }
 *
 * The packaging / card-design twin of /api/uploads/product-image: same
 * public bucket, same limits, its own `gift-options/` prefix.
 */
export async function POST(request) {
  try {
    // getSession, not requireAdmin — a JSON endpoint answers 401, not a
    // redirect to /login (see the product uploader).
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

    // Advisory: a presigned PUT cannot enforce this.
    const size = Number(body.size);
    if (Number.isFinite(size) && size > MAX_IMAGE_BYTES) {
      return badRequest(`That image is too large. Keep it under ${MAX_IMAGE_MB}MB.`);
    }

    return ok(await presignGiftOptionImageUpload({ contentType }));
  } catch (error) {
    console.error("POST /api/uploads/gift-option-image failed:", error);
    return serverError("Could not start the upload");
  }
}
