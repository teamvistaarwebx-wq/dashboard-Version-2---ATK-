import { connectDb } from "@/db/connect";
import { OtpCode } from "@/models/otp-code.model";
import {
  OTP_MAX_ATTEMPTS,
  OTP_TOKEN_TTL_MS,
  hashCode,
  isValidPhone,
  mintOtpToken,
  normalizePhone,
  safeEqual,
} from "@/lib/otp";
import { isInternalRequest, unauthorized } from "@/lib/internal-auth";

/**
 * POST /api/otp/verify — internal; the storefront proxies to it.
 *
 * On success returns a short-lived token the checkout spends when placing
 * the order. The record is kept (not deleted) until its TTL sweeps it, so
 * order creation can confirm the phone genuinely verified rather than
 * trusting the signature alone.
 */
export async function POST(request) {
  if (!isInternalRequest(request)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = normalizePhone(body?.phone);
  const code = String(body?.code ?? "").trim();

  if (!isValidPhone(phone)) {
    return Response.json({ error: "Invalid phone number" }, { status: 400 });
  }
  if (!/^\d{4,8}$/.test(code)) {
    return Response.json({ error: "Invalid code" }, { status: 400 });
  }

  await connectDb();

  const record = await OtpCode.findOne({ phone });
  if (!record) {
    return Response.json(
      { error: "No active code. Request a new one." },
      { status: 404 }
    );
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await OtpCode.deleteOne({ _id: record._id });
    return Response.json(
      { error: "Code expired. Request a new one." },
      { status: 410 }
    );
  }

  if (record.isLocked()) {
    return Response.json(
      { error: "Too many wrong attempts. Request a new code." },
      { status: 429 }
    );
  }

  if (!safeEqual(hashCode(code, record.salt), record.codeHash)) {
    record.attempts += 1;
    await record.save();

    const remaining = Math.max(0, OTP_MAX_ATTEMPTS - record.attempts);
    return Response.json(
      {
        error:
          remaining > 0
            ? `Wrong code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
            : "Too many wrong attempts. Request a new code.",
        remaining,
      },
      { status: 401 }
    );
  }

  record.verified = true;
  record.verifiedAt = new Date();
  await record.save();

  return Response.json({
    verified: true,
    phone,
    token: mintOtpToken(phone),
    tokenExpiresInMs: OTP_TOKEN_TTL_MS,
  });
}
