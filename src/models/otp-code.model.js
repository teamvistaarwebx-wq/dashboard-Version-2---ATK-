import mongoose from "mongoose";
import { OTP_MAX_ATTEMPTS, OTP_TOKEN_TTL_MS } from "@/lib/otp";

/**
 * One OTP challenge per phone. On resend we overwrite the same document,
 * so a user never has two live codes.
 *
 * `expiresAt` has a TTL index — Mongo sweeps expired codes on its own,
 * roughly every 60 seconds. The window is short (10 min), so lag doesn't
 * matter.
 */
const OtpCodeSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    codeHash: { type: String, required: true },
    salt: { type: String, required: true },
    expiresAt: { type: Date, required: true },

    // Wrong-code counter. When it hits OTP_MAX_ATTEMPTS the record is
    // invalidated to defeat brute force; the user must request a new code.
    attempts: { type: Number, default: 0 },

    // Per-window send counter and window start — used to rate-limit
    // resends independently of successful verifications.
    sendCount: { type: Number, default: 1 },
    windowStart: { type: Date, default: () => new Date() },
    lastSentAt: { type: Date, default: () => new Date() },

    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// TTL — Mongo deletes docs after `expiresAt` passes.
OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

OtpCodeSchema.methods.isLocked = function isLocked() {
  return this.attempts >= OTP_MAX_ATTEMPTS;
};

/**
 * A verified challenge stays usable for as long as the minted token lives,
 * so order creation can confirm the phone really passed OTP rather than
 * trusting the signature alone.
 */
OtpCodeSchema.methods.isVerificationFresh = function isVerificationFresh() {
  if (!this.verified || !this.verifiedAt) return false;
  return Date.now() - this.verifiedAt.getTime() <= OTP_TOKEN_TTL_MS;
};

// Hot reload safety: reuse the compiled model instead of recompiling.
export const OtpCode =
  mongoose.models.OtpCode || mongoose.model("OtpCode", OtpCodeSchema);
