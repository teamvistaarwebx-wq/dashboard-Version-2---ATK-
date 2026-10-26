import { connectDb } from "@/db/connect";
import { Inquiry, generateInquiryNumber } from "@/models/inquiry.model";
import { INQUIRY_SOURCE } from "@/constants/enums";
import { normalizePhone } from "@/lib/otp";
import {
  buildCorporate,
  corporateHeadcount,
  priceBox,
} from "@/features/gifting/lib/price-box";
import { verifyCardLogo } from "@/features/gifting/lib/card-logo";

/**
 * Records a corporate enquiry sent from the storefront's Request a Quote path.
 *
 * Deliberately unlike createOrder in two ways:
 *
 *   - **No proof of identity.** An enquiry is a lead, not a transaction, so
 *     there is no OTP and no session requirement. Nothing is charged and
 *     nothing is reserved, so the worst a junk submission costs is a row the
 *     team marks `lost`. This is also why the caller must NOT upsert a
 *     Customer from it — an unverified phone would let anyone mint a customer
 *     record against somebody else's number.
 *   - **No quota or card-message gate.** The box is a sample of what they
 *     like; the quota is the ask. Requiring 60 units be picked one at a time
 *     before the team may be contacted is exactly the friction this path
 *     exists to remove.
 *
 * The box is still priced from the catalog, because an "indicative total" the
 * browser could set is worth nothing to whoever quotes it.
 */
export async function createInquiry(input) {
  await connectDb();

  const corporate = buildCorporate(input.corporate);
  if (!corporate) return { error: "Company name is required." };

  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length === 0) {
    return { error: "Add at least one product before sending an enquiry." };
  }

  const priced = await priceBox({ ...input, items }, { requireMessage: false });
  if (priced.error) return priced;

  // Optional, but a logo that was sent must pass every rule before it is
  // recorded — see verifyCardLogo.
  const logo = await verifyCardLogo(input.cardLogo);
  if (logo.error) return logo;

  // Headcount comes from the quota, not the box — the whole point of this
  // path is that the two do not have to match.
  const headcount = corporateHeadcount(corporate);

  const inquiry = await Inquiry.create({
    inquiryNumber: generateInquiryNumber(),
    source: INQUIRY_SOURCE.CORPORATE_FORM,

    contactName: input.contact.fullName.trim(),
    companyName: corporate.companyName,
    email: input.contact.email.trim().toLowerCase(),
    phone: normalizePhone(input.contact.phone),
    customerId: input.customerId ?? null,

    headcount,
    /** The dashboard's open-pipeline sum reads `budget`, not `amounts`. */
    budget: priced.amounts.total,

    occasion: corporate.occasion,
    neededBy: corporate.neededBy,
    message: corporate.notes,

    items: priced.items,
    packaging: priced.packaging,
    card: priced.card,
    cardMessage: priced.message,
    cardLogo: logo.logo,

    address: {
      line1: String(input.address?.line1 ?? "").trim(),
      city: String(input.address?.city ?? "").trim(),
      pincode: String(input.address?.pincode ?? "").trim(),
      state: String(input.address?.state ?? "").trim(),
    },

    amounts: {
      subtotal: priced.amounts.subtotal,
      packaging: priced.amounts.packaging,
      card: priced.amounts.card,
      total: priced.amounts.total,
    },

    categoryLimits: corporate.limits,
  });

  return {
    inquiryId: String(inquiry._id),
    inquiryNumber: inquiry.inquiryNumber,
    amounts: priced.amounts,
  };
}
