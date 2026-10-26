import { connectDb } from "@/db/connect";
import { Customer } from "@/models/customer.model";
import { isValidPhone, normalizePhone } from "@/lib/otp";

/**
 * Finds or creates a customer by phone.
 *
 * Called from both guest checkout and login, which is what makes phone the
 * identity: a guest order and a later sign-in converge on the same record.
 *
 * Name and email only ever fill blanks — a checkout typo should not
 * overwrite what someone set on their profile.
 */
export async function upsertCustomer({
  phone,
  fullName = "",
  email = "",
  via = "checkout",
  touchLogin = false,
}) {
  const normalized = normalizePhone(phone);
  if (!isValidPhone(normalized)) return { error: "Valid phone is required" };

  await connectDb();

  const existing = await Customer.findOne({ phone: normalized });

  if (!existing) {
    const created = await Customer.create({
      phone: normalized,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      firstSeenVia: via,
      lastLoginAt: touchLogin ? new Date() : null,
    });

    return { customer: toCustomer(created) };
  }

  if (existing.isBlocked) return { error: "This account is not available." };

  let dirty = false;

  if (!existing.fullName && fullName.trim()) {
    existing.fullName = fullName.trim();
    dirty = true;
  }
  if (!existing.email && email.trim()) {
    existing.email = email.trim().toLowerCase();
    dirty = true;
  }
  if (touchLogin) {
    existing.lastLoginAt = new Date();
    dirty = true;
  }

  if (dirty) await existing.save();

  return { customer: toCustomer(existing) };
}

export async function getCustomer(id) {
  if (!id) return null;

  await connectDb();

  const doc = await Customer.findById(id).catch(() => null);
  return doc ? toCustomer(doc) : null;
}

/** Never leaks isBlocked or internal timestamps to the storefront. */
export function toCustomer(doc) {
  return {
    id: String(doc._id),
    phone: doc.phone,
    fullName: doc.fullName ?? "",
    email: doc.email ?? "",
    addresses: (doc.addresses ?? []).map((address) => ({
      id: String(address._id),
      label: address.label ?? "",
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      city: address.city,
      pincode: address.pincode,
      state: address.state,
      isDefault: Boolean(address.isDefault),
    })),
  };
}
