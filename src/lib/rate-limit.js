import { connectDb } from "@/db/connect";
import { RateLimit } from "@/models/rate-limit.model";

/**
 * Counts one hit against `key` and says whether it is within `limit` for the
 * current window.
 *
 * Fixed window, not sliding: a burst at a window boundary can get up to twice
 * the limit, which is fine for keeping a public upload form from being used
 * as free storage — the goal is a ceiling, not exact metering.
 *
 * Returns `{ allowed, retryAfter }`, retryAfter in seconds.
 */
export async function consumeRateLimit(key, { limit, windowMs }) {
  await connectDb();

  const now = new Date();

  // Inside a live window: count the hit atomically.
  const live = await RateLimit.findOneAndUpdate(
    { key, windowStart: { $gt: new Date(now.getTime() - windowMs) } },
    { $inc: { count: 1 } },
    { new: true }
  ).lean();

  if (live) {
    if (live.count <= limit) return { allowed: true, retryAfter: 0 };

    const endsAt = new Date(live.windowStart).getTime() + windowMs;
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((endsAt - now.getTime()) / 1000)),
    };
  }

  // No window, or an expired one: start a new window with this hit.
  try {
    await RateLimit.updateOne(
      { key },
      {
        $set: {
          count: 1,
          windowStart: now,
          expiresAt: new Date(now.getTime() + windowMs),
        },
      },
      { upsert: true }
    );
  } catch (error) {
    // Two first hits raced on the unique key. The other one opened the
    // window; this hit is let through rather than failing an honest upload.
    if (error?.code !== 11000) throw error;
  }

  return { allowed: true, retryAfter: 0 };
}
