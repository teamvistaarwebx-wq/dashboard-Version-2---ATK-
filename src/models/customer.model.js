import mongoose from "mongoose";

/**
 * A shopper, identified by phone.
 *
 * Records are created by guest checkout as well as by login, so someone who
 * checks out without an account still has one waiting when they later sign
 * in with the same number — their past orders are already theirs.
 */

/**
 * Addresses are embedded rather than a separate collection: they are only
 * ever read alongside their customer, and the list stays short.
 */
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "", trim: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const customerSchema = new mongoose.Schema(
  {
    /** The identity. Everything else can change; this is the key. */
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    fullName: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },

    addresses: { type: [addressSchema], default: [] },

    lastLoginAt: { type: Date, default: null },
    /** Set on the first guest checkout; distinguishes them from sign-ups. */
    firstSeenVia: {
      type: String,
      enum: ["checkout", "login"],
      default: "checkout",
    },

    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

customerSchema.index({ createdAt: -1 });

/**
 * Exactly one default address, so checkout always has a preselection.
 *
 * No `next` parameter: Mongoose 9 does not pass one. A sync hook simply
 * returns, and throwing aborts the save.
 */
customerSchema.pre("save", function normalizeAddresses() {
  if (!Array.isArray(this.addresses) || this.addresses.length === 0) return;

  const defaults = this.addresses.filter((a) => a.isDefault);
  if (defaults.length === 1) return;

  this.addresses.forEach((address, index) => {
    address.isDefault = index === 0;
  });
});

export const Customer =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);
