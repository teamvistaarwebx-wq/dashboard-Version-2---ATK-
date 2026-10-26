import {
  ALLOWED_LOGO_TYPES,
  LOGO_UPLOADS_PER_WINDOW,
  LOGO_UPLOAD_WINDOW_MS,
  MAX_LOGO_BYTES,
  MAX_LOGO_MB,
} from "@/constants/media";
import { badRequest, ok, serverError } from "@/lib/api-response";
import { isInternalRequest, unauthorized } from "@/lib/internal-auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { presignLogoUpload } from "@/lib/r2";

/**
 * POST /api/uploads/card-logo  →  { uploadUrl, key }
 *
 * Called by the storefront, server-to-server, when a corporate shopper adds
 * a logo for the printed card. Unlike the product and banner uploaders this
 * is reachable from a public page — the enquiry path asks for no OTP — so it
 * is rate-limited per client IP, and everything it lets through is verified
 * again (type, size, real file signature) before an order or enquiry may
 * reference it. See verifyCardLogo.
 *
 * The bytes go straight from the browser to the PRIVATE uploads bucket; this
 * returns no public URL because there is none.
 */
export async function POST(request) {
  if (!isInternalRequest(request)) return unauthorized();

  try {
    const body = await request.json().catch(() => null);
    if (!body) return badRequest("Expected a JSON body");

    const contentType = String(body.contentType ?? "");
    if (!ALLOWED_LOGO_TYPES[contentType]) {
      return badRequest("Upload your logo as an SVG, PDF or PNG file.");
    }

    // Advisory, like the product uploader's: a presigned PUT cannot enforce
    // it. The real check runs on the stored object at submit time.
    const size = Number(body.size);
    if (!Number.isFinite(size) || size <= 0) {
      return badRequest("That file looks empty.");
    }
    if (size > MAX_LOGO_BYTES) {
      return badRequest(`That logo is too large. Keep it under ${MAX_LOGO_MB}MB.`);
    }

    // The storefront forwards the shopper's IP; without one every caller
    // shares a single bucket, which fails closed rather than open.
    const clientIp = String(body.clientIp ?? "").trim().slice(0, 64) || "unknown";
    const limit = await consumeRateLimit(`card-logo:${clientIp}`, {
      limit: LOGO_UPLOADS_PER_WINDOW,
      windowMs: LOGO_UPLOAD_WINDOW_MS,
    });

    if (!limit.allowed) {
      return Response.json(
        {
          error: "Too many logo uploads. Please try again later.",
          retryAfter: limit.retryAfter,
        },
        { status: 429 }
      );
    }

    return ok(await presignLogoUpload({ contentType }));
  } catch (error) {
    console.error("POST /api/uploads/card-logo failed:", error);
    // A missing R2_UPLOADS_* variable lands here — say so without leaking which.
    return serverError("Could not start the upload");
  }
}
