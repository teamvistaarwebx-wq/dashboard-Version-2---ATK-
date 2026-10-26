import crypto from "crypto";
import { promisify } from "util";

/**
 * Password hashing for admin staff.
 *
 * scrypt from node:crypto rather than bcrypt: it is memory-hard, ships with
 * the runtime, and keeps the dependency surface identical to the HMAC work
 * already in `lib/otp.js`. No native build step, nothing to audit.
 */
const scrypt = promisify(crypto.scrypt);

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/**
 * Cost parameters. N=16384 lands around 50-100ms per hash on a laptop — slow
 * enough to make offline guessing expensive, fast enough that a sign-in feels
 * instant. `maxmem` must be raised explicitly: Node's 32MB default rejects
 * these parameters.
 */
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** Rejects the passwords that make every other control here pointless. */
export const MIN_PASSWORD_LENGTH = 10;

export function validatePassword(plain) {
  const value = String(plain ?? "");

  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (value.length > 200) return "Password is too long";
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    return "Password must contain both letters and a number";
  }

  return null;
}

export async function hashPassword(plain) {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derived = await scrypt(String(plain), salt, KEY_LENGTH, SCRYPT_OPTIONS);

  return { hash: derived.toString("hex"), salt };
}

/**
 * Never throws — a malformed or missing stored hash is a failed sign-in, not
 * a 500. Callers only ever branch on the boolean.
 */
export async function verifyPassword(plain, hash, salt) {
  if (!plain || !hash || !salt) return false;

  try {
    const derived = await scrypt(
      String(plain),
      salt,
      KEY_LENGTH,
      SCRYPT_OPTIONS
    );
    const expected = Buffer.from(hash, "hex");

    if (expected.length !== derived.length) return false;

    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Invite tokens. The raw token only ever exists in the invite URL; the row
 * keeps the hash, so a database leak cannot be replayed into an account.
 *
 * SHA-256 rather than scrypt: the token is 32 random bytes, so there is no
 * low-entropy guess for a slow hash to defend against.
 */
export function generateInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashInviteToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}
