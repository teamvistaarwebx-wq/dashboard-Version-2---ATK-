import { connectDb } from "@/db/connect";
import { OtpCode } from "@/models/otp-code.model";
import {
  OTP_MAX_SENDS_PER_WINDOW,
  OTP_RESEND_COOLDOWN_MS,
  OTP_SEND_WINDOW_MS,
  OTP_TTL_MS,
  generateCode,
  hashCode,
  isValidPhone,
  makeSalt,
  normalizePhone,
} from "@/lib/otp";
import { sendTemplateMessage, trackUser } from "@/lib/interakt";
import { isInternalRequest, unauthorized } from "@/lib/internal-auth";

/**
 * POST /api/otp/send — internal; the storefront proxies to it.
 *
 * Stores a hashed code with a 10-minute TTL and fires the WhatsApp template.
 * Two limits stop a single number being spammed: a 30-second cooldown, and
 * three sends per rolling 10-minute window.
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
  if (!isValidPhone(phone)) {
    return Response.json({ error: "Invalid phone number" }, { status: 400 });
  }

  await connectDb();

  const now = new Date();
  const existing = await OtpCode.findOne({ phone });

  if (existing) {
    const sinceLast = now.getTime() - new Date(existing.lastSentAt).getTime();
    if (sinceLast < OTP_RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((OTP_RESEND_COOLDOWN_MS - sinceLast) / 1000);
      return Response.json(
        {
          error: `Please wait ${retryAfter}s before requesting a new code`,
          retryAfter,
        },
        { status: 429 }
      );
    }

    const sinceWindow =
      now.getTime() - new Date(existing.windowStart).getTime();
    if (
      sinceWindow < OTP_SEND_WINDOW_MS &&
      existing.sendCount >= OTP_MAX_SENDS_PER_WINDOW
    ) {
      return Response.json(
        {
          error: "Too many code requests. Try again in a few minutes.",
          retryAfter: Math.ceil((OTP_SEND_WINDOW_MS - sinceWindow) / 1000),
        },
        { status: 429 }
      );
    }
  }

  const code = generateCode();
  const salt = makeSalt();
  const inWindow =
    existing &&
    now.getTime() - new Date(existing.windowStart).getTime() <
      OTP_SEND_WINDOW_MS;

  await OtpCode.findOneAndUpdate(
    { phone },
    {
      phone,
      codeHash: hashCode(code, salt),
      salt,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      attempts: 0,
      verified: false,
      verifiedAt: null,
      lastSentAt: now,
      ...(inWindow
        ? { $inc: { sendCount: 1 } }
        : { sendCount: 1, windowStart: now }),
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  try {
    // Interakt needs the number to exist as a contact before templating it.
    await trackUser(phone);
    await sendTemplateMessage(phone, code);
  } catch (error) {
    // Roll back, so a send that never happened doesn't burn the cooldown.
    await OtpCode.deleteOne({ phone });

    console.error("[otp/send] Interakt failed", error);
    return Response.json(
      { error: "Could not send OTP right now. Please try again." },
      { status: 502 }
    );
  }

  return Response.json({
    sent: true,
    phone,
    expiresInMs: OTP_TTL_MS,
    resendInMs: OTP_RESEND_COOLDOWN_MS,
  });
}
