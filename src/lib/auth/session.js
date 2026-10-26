import { cookies } from "next/headers";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { ADMIN_SESSION_COOKIE } from "./cookie";

/**
 * Admin session — same shape as the storefront's `lib/session.js`, with its
 * own cookie, secret and a much shorter life. A back office left open on a
 * shared machine is a different risk from a shopper's phone, so this expires
 * in hours rather than the storefront's 30 days.
 */
const ALG = "HS256";
const MAX_AGE_SECONDS = 8 * 60 * 60;

function secretKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSession(adminUser) {
  const token = await new SignJWT({
    email: adminUser.email,
    name: adminUser.fullName ?? "",
    role: adminUser.role,
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(String(adminUser._id ?? adminUser.id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * cache() matters: the dashboard layout, the page and every panel underneath
 * all ask who is signed in, and without it each one re-verifies the JWT.
 */
export const getSession = cache(async function getSession() {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: [ALG],
    });

    if (!payload.sub) return null;

    return {
      adminId: String(payload.sub),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: String(payload.role ?? ""),
    };
  } catch {
    // Expired, tampered, or signed with a rotated secret — all mean signed
    // out. Never throw: a bad cookie must not break page rendering.
    return null;
  }
});

export async function destroySession() {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
}
