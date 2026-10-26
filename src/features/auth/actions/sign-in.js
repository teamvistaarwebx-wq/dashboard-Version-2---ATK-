"use server";

import { redirect } from "next/navigation";
import { connectDb } from "@/db/connect";
import { AdminUser } from "@/models/admin-user.model";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

/**
 * One message for every failure. Distinguishing "no such account" from "wrong
 * password" would turn this form into an email-enumeration oracle, and
 * naming the lockout would tell an attacker their guessing is working.
 */
const GENERIC_FAILURE = "Email or password is incorrect";

/** Only relative in-app paths, so `?from=` cannot become an open redirect. */
function safeRedirect(from) {
  const value = String(from ?? "");
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function signIn(_prevState, formData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const destination = safeRedirect(formData.get("from"));

  if (!email || !password) {
    return { error: "Enter your email and password" };
  }

  await connectDb();

  // `+` on the projection: credentials are `select: false` on the schema.
  const user = await AdminUser.findOne({ email }).select(
    "+passwordHash +passwordSalt"
  );

  // Still hash on a miss, so a non-existent email does not answer faster than
  // a real one and leak its existence through timing.
  if (!user) {
    await verifyPassword(password, "0".repeat(128), "decoy");
    return { error: GENERIC_FAILURE };
  }

  if (user.isLocked()) {
    return { error: GENERIC_FAILURE };
  }

  const valid =
    user.canSignIn() &&
    (await verifyPassword(password, user.passwordHash, user.passwordSalt));

  if (!valid) {
    const attempts = (user.failedAttempts ?? 0) + 1;

    await AdminUser.updateOne(
      { _id: user._id },
      {
        $set: {
          failedAttempts: attempts,
          lockedUntil:
            attempts >= MAX_FAILED_ATTEMPTS
              ? new Date(Date.now() + LOCK_DURATION_MS)
              : null,
        },
      }
    );

    return { error: GENERIC_FAILURE };
  }

  await AdminUser.updateOne(
    { _id: user._id },
    {
      $set: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    }
  );

  await createSession(user);

  // Throws past the form's error handling — the cookie is already set, so
  // there is nothing left to report.
  redirect(destination);
}
