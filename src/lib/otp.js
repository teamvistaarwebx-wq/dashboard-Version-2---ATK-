import crypto from "crypto";

/** OTP knobs. Kept centrally so every call site agrees. */
export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
export const OTP_MAX_SENDS_PER_WINDOW = 3;
export const OTP_SEND_WINDOW_MS = 10 * 60 * 1000;

/** How long a verified challenge can be spent placing an order. */
export const OTP_TOKEN_TTL_MS = 15 * 60 * 1000;

/** Zero-padded numeric code — matches the WhatsApp OTP template. */
export function generateCode() {
  const max = 10 ** OTP_LENGTH;
  const n = crypto.randomInt(0, max);
  return String(n).padStart(OTP_LENGTH, "0");
}

/**
 * Hashes the code with a per-record salt so a DB leak doesn't hand out
 * live codes. Codes are short-lived anyway, but hashing is cheap.
 */
export function hashCode(code, salt) {
  return crypto
    .createHmac("sha256", salt)
    .update(String(code))
    .digest("hex");
}

export function makeSalt() {
  return crypto.randomBytes(16).toString("hex");
}

/** Constant-time compare so wrong-code attempts leak no info via timing. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function countryCode() {
  const cc = (process.env.OTP_PHONE_DEFAULT_CC || "+91").replace(/[^\d+]/g, "");
  return cc.startsWith("+") ? cc : `+${cc}`;
}

/**
 * Normalises anything the user types into E.164.
 *
 *   "99999 99999"    -> "+919999999999"
 *   "0 9999999999"   -> "+919999999999"   (drops the STD trunk prefix)
 *   "+919999999999"  -> unchanged
 */
export function normalizePhone(raw) {
  const cleaned = String(raw ?? "").replace(/[^\d+]/g, "");
  if (!cleaned) return "";

  if (cleaned.startsWith("+")) return cleaned;

  const cc = countryCode();

  // Typed with the country code but no plus: "919999999999".
  const bare = cc.slice(1);
  if (cleaned.startsWith(bare) && cleaned.length === bare.length + 10) {
    return `+${cleaned}`;
  }

  // Indians routinely dial a leading 0 before a mobile number.
  return `${cc}${cleaned.replace(/^0+/, "")}`;
}

/**
 * India only for now: +91 followed by a 10-digit mobile number.
 *
 * Indian mobiles always start 6–9, so this rejects landlines and typos that
 * would otherwise reach Interakt and fail there with a worse message.
 */
export function isValidPhone(normalized) {
  const cc = countryCode();
  const value = String(normalized);

  if (!value.startsWith(cc)) return false;
  return /^[6-9]\d{9}$/.test(value.slice(cc.length));
}

// ---------------------------------------------------------------------------
// Proof-of-verification token
// ---------------------------------------------------------------------------

/**
 * `${phone}.${expiresAt}.${hmac}` — handed to the browser after a correct
 * code and spent when the order is placed.
 *
 * Both minting and checking live here, in the admin, so the secret exists in
 * exactly one app and the two halves cannot drift apart.
 */
function tokenSecret() {
  const secret = process.env.OTP_TOKEN_SECRET;
  if (!secret) throw new Error("OTP_TOKEN_SECRET is not set");
  return secret;
}

export function mintOtpToken(phone) {
  const expiresAt = Date.now() + OTP_TOKEN_TTL_MS;
  const payload = `${phone}.${expiresAt}`;
  const hmac = crypto
    .createHmac("sha256", tokenSecret())
    .update(payload)
    .digest("hex");

  return `${payload}.${hmac}`;
}

/** Bound to the phone, so a stolen token is useless for another number. */
export function verifyOtpToken(token, expectedPhone) {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [phone, expiresAtStr, providedHmac] = parts;
  const expiresAt = Number(expiresAtStr);

  if (!phone || !Number.isFinite(expiresAt)) return false;
  if (Date.now() > expiresAt) return false;
  if (phone !== expectedPhone) return false;

  const expectedHmac = crypto
    .createHmac("sha256", tokenSecret())
    .update(`${phone}.${expiresAt}`)
    .digest("hex");

  return safeEqual(providedHmac, expectedHmac);
}
