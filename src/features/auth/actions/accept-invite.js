"use server";

import { redirect } from "next/navigation";
import { connectDb } from "@/db/connect";
import { AdminUser } from "@/models/admin-user.model";
import { ADMIN_STATUS } from "@/constants/enums";
import {
  hashInviteToken,
  hashPassword,
  validatePassword,
} from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { safeEqual } from "@/lib/otp";

/**
 * Spends an invite token: sets the password, flips the account to active and
 * signs the person straight in.
 *
 * The token is the only credential here, so there is no DAL check — but it is
 * single-use (cleared on success), time-limited, and bound to the email in
 * the link, so a leaked token cannot be pointed at another account.
 */
export async function acceptInvite(_prevState, formData) {
  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!token || !email) {
    return { error: "This invite link is incomplete. Ask for a new one." };
  }

  const invalidPassword = validatePassword(password);
  if (invalidPassword) return { error: invalidPassword };
  if (password !== confirm) return { error: "The two passwords do not match" };

  await connectDb();

  const user = await AdminUser.findOne({ email }).select("+inviteTokenHash");

  const usable =
    user &&
    user.status === ADMIN_STATUS.INVITED &&
    user.inviteTokenHash &&
    user.inviteExpiresAt &&
    user.inviteExpiresAt.getTime() > Date.now() &&
    safeEqual(hashInviteToken(token), user.inviteTokenHash);

  if (!usable) {
    return { error: "This invite link is invalid or has expired." };
  }

  const { hash, salt } = await hashPassword(password);

  await AdminUser.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash: hash,
        passwordSalt: salt,
        status: ADMIN_STATUS.ACTIVE,
        // Single use — the same link cannot reset the password again later.
        inviteTokenHash: "",
        inviteExpiresAt: null,
        lastLoginAt: new Date(),
      },
    }
  );

  await createSession(user);
  redirect("/");
}
