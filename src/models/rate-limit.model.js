import mongoose from "mongoose";

/**
 * A fixed-window counter for one key, e.g. "card-logo:203.0.113.7".
 *
 * Kept in Mongo rather than in memory because serverless instances share
 * nothing: an in-process counter would reset on every cold start and differ
 * between the instances a burst is spread across.
 *
 * `expiresAt` has a TTL index, so idle keys clean themselves up the same way
 * OTP codes do.
 */
const RateLimitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    windowStart: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
);

RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Hot reload safety: reuse the compiled model instead of recompiling.
export const RateLimit =
  mongoose.models.RateLimit || mongoose.model("RateLimit", RateLimitSchema);
