import { connectDb } from "@/db/connect";
import { Customer } from "@/models/customer.model";
import { ALL_INDIAN_STATES } from "@/constants/india";
import { toCustomer } from "./upsert-customer";

/**
 * Profile and address mutations.
 *
 * Every function takes the customer id as its first argument and the caller
 * is responsible for having proven it — the storefront reads it from the
 * session cookie, never from a request body.
 *
 * Phone is deliberately not updatable: it is the identity, and changing it
 * would need a fresh OTP against the new number.
 */

const MAX_ADDRESSES = 10;

export async function updateProfile(customerId, { fullName, email }) {
  await connectDb();

  const customer = await Customer.findById(customerId).catch(() => null);
  if (!customer) return { error: "Customer not found" };

  if (typeof fullName === "string") {
    const trimmed = fullName.trim();
    if (trimmed.length < 2) return { error: "Please enter your full name" };
    customer.fullName = trimmed;
  }

  if (typeof email === "string") {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && !/^\S+@\S+\.\S+$/.test(trimmed)) {
      return { error: "Please enter a valid email" };
    }
    customer.email = trimmed;
  }

  await customer.save();
  return { customer: toCustomer(customer) };
}

export async function addAddress(customerId, input) {
  await connectDb();

  const customer = await Customer.findById(customerId).catch(() => null);
  if (!customer) return { error: "Customer not found" };

  if (customer.addresses.length >= MAX_ADDRESSES) {
    return { error: `You can save up to ${MAX_ADDRESSES} addresses` };
  }

  const invalid = validateAddress(input);
  if (invalid) return { error: invalid };

  // First address is always the default — otherwise checkout has nothing
  // preselected.
  const makeDefault = input.isDefault || customer.addresses.length === 0;
  if (makeDefault) clearDefaults(customer);

  customer.addresses.push({ ...cleanAddress(input), isDefault: makeDefault });

  await customer.save();
  return { customer: toCustomer(customer) };
}

export async function updateAddress(customerId, addressId, input) {
  await connectDb();

  const customer = await Customer.findById(customerId).catch(() => null);
  if (!customer) return { error: "Customer not found" };

  const address = customer.addresses.id(addressId);
  if (!address) return { error: "Address not found" };

  const invalid = validateAddress(input);
  if (invalid) return { error: invalid };

  if (input.isDefault) clearDefaults(customer);

  Object.assign(address, cleanAddress(input));
  // Never let the only address stop being the default.
  address.isDefault = Boolean(input.isDefault) || customer.addresses.length === 1;

  await customer.save();
  return { customer: toCustomer(customer) };
}

export async function deleteAddress(customerId, addressId) {
  await connectDb();

  const customer = await Customer.findById(customerId).catch(() => null);
  if (!customer) return { error: "Customer not found" };

  const address = customer.addresses.id(addressId);
  if (!address) return { error: "Address not found" };

  const wasDefault = address.isDefault;
  address.deleteOne();

  // Promote another address so a default always exists.
  if (wasDefault && customer.addresses.length > 0) {
    customer.addresses[0].isDefault = true;
  }

  await customer.save();
  return { customer: toCustomer(customer) };
}

function clearDefaults(customer) {
  customer.addresses.forEach((address) => {
    address.isDefault = false;
  });
}

function cleanAddress(input) {
  return {
    label: String(input.label ?? "").trim(),
    fullName: String(input.fullName ?? "").trim(),
    phone: String(input.phone ?? "").trim(),
    line1: String(input.line1 ?? "").trim(),
    city: String(input.city ?? "").trim(),
    pincode: String(input.pincode ?? "").trim(),
    state: String(input.state ?? "").trim(),
  };
}

/**
 * Validated here, not just in the browser — this route is reachable with a
 * session cookie and a curl command.
 */
function validateAddress(input) {
  const a = cleanAddress(input);

  if (a.fullName.length < 2) return "Recipient name is required";
  if (!/^\+?\d[\d\s-]{8,15}$/.test(a.phone)) return "A valid phone is required";
  if (a.line1.length < 5) return "Address is required";
  if (!a.city) return "City is required";
  if (!/^\d{6}$/.test(a.pincode)) return "Enter a 6-digit pincode";
  if (!ALL_INDIAN_STATES.includes(a.state)) return "Select a valid state";

  return null;
}
