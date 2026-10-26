import mongoose from "mongoose";
import {
  ADMIN_ROLE,
  ADMIN_ROLE_VALUES,
  ADMIN_STATUS,
  ADMIN_STATUS_VALUES,
} from "@/constants/enums";

/**
 * Staff who sign in to this admin app. Not related to Customer — a shopper
 * authenticates with a phone OTP against the storefront and never reaches
 * these routes.
 *
 * There is no self-service signup. The first `super_admin` arrives via
 * `scripts/seed-super-admin.js`; everyone after that is invited from Settings
 * and lands with `status: "invited"` until they set a password.
 */
const adminUserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    fullName: { type: String, required: true, trim: true },

    /**
     * Credentials are `select: false` so a stray `.lean()` in a query written
     * later cannot leak them into a server component's props.
     *
     * Absent until an invite is accepted, which is why they are not required.
     */
    passwordHash: { type: String, default: "", select: false },
    passwordSalt: { type: String, default: "", select: false },

    role: {
      type: String,
      enum: ADMIN_ROLE_VALUES,
      default: ADMIN_ROLE.STAFF,
      index: true,
    },

    status: {
      type: String,
      enum: ADMIN_STATUS_VALUES,
      default: ADMIN_STATUS.INVITED,
      index: true,
    },

    /** Only the hash is stored — the raw token lives in the invite URL. */
    inviteTokenHash: { type: String, default: "", select: false },
    inviteExpiresAt: { type: Date, default: null },

    /**
     * Throttles password guessing. Reset to 0 on any successful sign-in, so a
     * legitimate user who mistypes twice is never locked out.
     */
    failedAttempts: { type: Number, default: 0, min: 0 },
    lockedUntil: { type: Date, default: null },

    lastLoginAt: { type: Date, default: null },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
    },
  },
  { timestamps: true }
);

/** Settings lists the team newest-first, grouped by who can still sign in. */
adminUserSchema.index({ status: 1, createdAt: -1 });

/** A password can only be set once the invite has been accepted. */
adminUserSchema.methods.canSignIn = function canSignIn() {
  return this.status === ADMIN_STATUS.ACTIVE;
};

adminUserSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockedUntil && this.lockedUntil.getTime() > Date.now());
};

export const AdminUser =
  mongoose.models.AdminUser || mongoose.model("AdminUser", adminUserSchema);
