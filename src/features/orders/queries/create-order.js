import { connectDb } from "@/db/connect";
import { Customer } from "@/models/customer.model";
import { Order, generateOrderNumber } from "@/models/order.model";
import { OtpCode } from "@/models/otp-code.model";
import { Reservation } from "@/models/reservation.model";
import { MAX_ORDER_HEADCOUNT, ORDER_STATUS } from "@/constants/enums";
import { isValidPhone, normalizePhone, verifyOtpToken } from "@/lib/otp";
import {
  buildCorporate,
  corporateHeadcount,
  priceBox,
} from "@/features/gifting/lib/price-box";
import { verifyCardLogo } from "@/features/gifting/lib/card-logo";
import {
  releaseReservations,
  reserveStock,
} from "@/features/inventory/lib/stock-ledger";

/**
 * Builds an order from ids and quantities alone.
 *
 * Every rupee is read from the catalog by `priceBox`, which create-inquiry.js
 * shares. The caller supplies WHAT was ordered; that decides what it costs.
 * Nothing monetary crossing the network is trusted, which is why the
 * storefront no longer computes totals at all.
 */

export async function createOrder(input) {
  await connectDb();

  const proven = await proveIdentity(input);
  if (proven.error) return proven;

  const corporate = buildCorporate(input.corporate);

  // Checked here, not only in the storefront: `limits` arrives from a
  // user-writable gift box, so the UI gate that disables Continue Building
  // Gift above 50 is UX, and this is the rule.
  if (corporate && corporateHeadcount(corporate) > MAX_ORDER_HEADCOUNT) {
    return {
      error: `Orders above ${MAX_ORDER_HEADCOUNT} gifts are arranged as enquiries — please request a quote and our team will build the quote with you.`,
    };
  }

  const priced = await priceBox(input);
  if (priced.error) return priced;

  // A logo is a corporate-card option. Checked before stock is held, so a
  // rejected logo leaves no reservations behind.
  if (input.cardLogo?.key && !corporate) {
    return { error: "A logo can only be printed on corporate gift cards." };
  }
  const logo = await verifyCardLogo(input.cardLogo);
  if (logo.error) return logo;

  // Compared BEFORE the write. Checking afterwards would leave an orphaned
  // pending order behind every price-change rejection.
  const expected = Number(input.expectedTotal);
  if (Number.isFinite(expected) && expected !== priced.amounts.total) {
    return { priceChanged: true, amounts: priced.amounts };
  }

  /**
   * Stock is secured BEFORE the order is written, not after.
   *
   * The other way round would mean taking an order — and, a moment later,
   * money — for a saree that sold out while the form was open. A failed hold
   * here leaves nothing behind to clean up.
   */
  const held = await reserveStock({ items: priced.items });
  if (held.error) return { error: held.error };

  let order;
  try {
    order = await Order.create({
      orderNumber: generateOrderNumber(),
      customerId: input.customerId ?? null,
      contact: {
        fullName: input.contact.fullName.trim(),
        email: input.contact.email.trim().toLowerCase(),
        phone: input.contact.phone,
      },
      address: {
        line1: input.address.line1.trim(),
        city: input.address.city.trim(),
        pincode: input.address.pincode.trim(),
        state: input.address.state.trim(),
      },
      items: priced.items,
      packaging: priced.packaging,
      card: priced.card,
      cardMessage: priced.message,
      cardLogo: logo.logo,
      amounts: priced.amounts,
      status: ORDER_STATUS.PENDING_PAYMENT,
      corporate,
      verifiedPhone: proven.verifiedPhone,
    });
  } catch (error) {
    // The holds exist but the order they were for does not. They would expire
    // on their own in fifteen minutes; giving them back now is better than
    // sitting on stock nobody is buying.
    await Reservation.deleteMany({ _id: { $in: held.reservationIds } });
    throw error;
  }

  /**
   * The reservations were taken before the order had an id, so they are
   * pointed at it now. Everything downstream — consuming on payment,
   * releasing on failure, the expiry sweep — finds them by `orderId`.
   */
  if (held.reservationIds.length > 0) {
    await Reservation.updateMany(
      { _id: { $in: held.reservationIds } },
      { $set: { orderId: order._id } }
    );
  }

  return { order, amounts: priced.amounts, holdExpiresAt: held.expiresAt };
}

/**
 * Gives an abandoned checkout's stock back early.
 *
 * Exported for the payment layer: when Razorpay reports a definite failure
 * there is no reason to make the shelf wait out the full fifteen minutes.
 */
export async function releaseOrderStock(orderId) {
  await connectDb();
  return releaseReservations({ orderId });
}

/**
 * An order is only accepted with proof of who is placing it. Two forms:
 *
 *   - `customerId` — the storefront resolved a signed session cookie. Safe to
 *     trust because this route is behind INTERNAL_API_SECRET, so the browser
 *     cannot reach it and cannot forge the cookie.
 *   - `otpToken` — a guest just passed OTP. Checked against both the HMAC and
 *     the stored challenge, so a leaked signing key alone isn't enough.
 */
async function proveIdentity(input) {
  const phone = normalizePhone(input.contact?.phone);
  if (!isValidPhone(phone)) return { error: "Valid phone is required" };

  if (input.customerId) {
    const customer = await Customer.findById(input.customerId).catch(() => null);

    if (!customer) return { error: "Session is no longer valid." };
    if (customer.isBlocked) return { error: "This account is not available." };
    // The session's phone is authoritative — a logged-in shopper cannot
    // place an order against somebody else's number.
    if (customer.phone !== phone) {
      return { error: "Phone does not match your account." };
    }

    return { verifiedPhone: customer.phone };
  }

  if (!verifyOtpToken(input.otpToken, phone)) {
    return { error: "OTP verification required" };
  }

  // The signature proves the token was minted here; the record proves a code
  // was actually entered. Both, so a key leak alone can't place orders.
  const record = await OtpCode.findOne({ phone });
  if (!record?.isVerificationFresh()) {
    return { error: "OTP verification required" };
  }

  return { verifiedPhone: phone };
}
