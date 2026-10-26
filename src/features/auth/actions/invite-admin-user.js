"use server";

import { revalidatePath } from "next/cache";
import { connectDb } from "@/db/connect";
import { AdminUser } from "@/models/admin-user.model";
import {
  ADMIN_ROLE,
  ADMIN_ROLE_VALUES,
  ADMIN_STATUS,
} from "@/constants/enums";
import { requireRole } from "@/lib/auth/dal";
import { generateInviteToken, hashInviteToken } from "@/lib/auth/password";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Invites a colleague. Returns the one-time URL for the inviter to pass on —
 * email delivery is a later pass, and a link shown once beats a link mailed
 * to a typo'd address.
 *
 * Authorised inside the action, not just behind the Settings page: a server
 * action is a public endpoint and can be called directly.
 */
export async function inviteAdminUser(_prevState, formData) {
  const session = await requireRole(ADMIN_ROLE.SUPER_ADMIN);

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "");

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Enter a valid email address" };
  }
  if (fullName.length < 2) return { error: "Enter the person's full name" };
  if (!ADMIN_ROLE_VALUES.includes(role)) return { error: "Pick a role" };
  if (role === ADMIN_ROLE.SUPER_ADMIN) {
    return { error: "There can only be one super admin" };
  }

  await connectDb();

  const existing = await AdminUser.findOne({ email }).select("status").lean();
  if (existing?.status === ADMIN_STATUS.ACTIVE) {
    return { error: "That person already has an account" };
  }

  const token = generateInviteToken();

  // Upsert, so re-inviting somebody who never accepted issues a fresh token
  // rather than colliding on the unique email index.
  await AdminUser.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        fullName,
        role,
        status: ADMIN_STATUS.INVITED,
        inviteTokenHash: hashInviteToken(token),
        inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
        invitedBy: session.adminId,
        passwordHash: "",
        passwordSalt: "",
        failedAttempts: 0,
        lockedUntil: null,
      },
    },
    { upsert: true }
  );

  const base = process.env.ADMIN_APP_URL || "http://localhost:3011";
  revalidatePath("/settings");

  return {
    inviteUrl: `${base}/accept-invite?token=${token}&email=${encodeURIComponent(email)}`,
  };
}
