import mongoose from "mongoose";
import { connectDb } from "@/db/connect";
import { Inquiry, generateInquiryNumber } from "@/models/inquiry.model";
import { Product } from "@/models/product.model";
import {
  FULFILLMENT,
  INQUIRY_SOURCE,
  PRODUCT_STATUS,
} from "@/constants/enums";
import { madeToOrderLeadDays } from "@/constants/made-to-order";
import { normalizePhone } from "@/lib/otp";
import { pickFeaturedImage } from "@/features/catalog/lib/product-card";
import { MAX_COMPANY_NAME, MAX_CORPORATE_NOTES } from "@/features/gifting/lib/price-box";

/**
 * Records a quote request for made-to-order products — the storefront's
 * quote box, sent from the floating sheet on the made-to-order pages.
 *
 * The gift-box enquiry's sibling, and deliberately thinner:
 *
 *   - **Pieces and quantities only.** No packaging, no card, no address.
 *     Sales settles all of that on the call.
 *   - **Company optional.** Individuals ask too — this path is open in both
 *     gifting modes.
 *   - **No date asked for.** `leadTimeDays` is what the customer was *shown*,
 *     worked out here from the units across every piece — one weave to plan,
 *     the same reading the storefront makes. The real date is agreed with them.
 *
 * What it keeps from the other path: nothing monetary comes from the browser.
 * The indicative value is each catalog price times its quantity, read here.
 * And, like every enquiry, no OTP and no Customer upsert — see
 * create-inquiry.js for why.
 */
export async function createMadeToOrderInquiry(input) {
  const wanted = mergeLines(input.items);

  if (wanted.some((line) => !mongoose.Types.ObjectId.isValid(line.productId))) {
    return { error: "One of these products is no longer available." };
  }

  await connectDb();

  const products = await Product.find({
    _id: { $in: wanted.map((line) => line.productId) },
    status: PRODUCT_STATUS.ACTIVE,
    isDeleted: false,
  })
    .select("title slug sku price images fulfillment")
    .lean();

  const byId = new Map(products.map((product) => [String(product._id), product]));

  const items = [];
  let value = 0;
  let units = 0;

  // In the order they were added, so sales reads the box as the customer did.
  for (const line of wanted) {
    const product = byId.get(line.productId);
    if (!product) return { error: "One of these products is no longer available." };

    // Only made-to-order pieces are quoted this way. An in-stock product is
    // bought through the gift box, and its stock rules would be bypassed here.
    if (product.fulfillment !== FULFILLMENT.MADE_TO_ORDER) {
      return { error: `${product.title} can be ordered directly from the shop.` };
    }

    const price = product.price ?? 0;
    value += price * line.quantity;
    units += line.quantity;

    items.push({
      productId: String(product._id),
      slug: product.slug ?? "",
      sku: product.sku ?? "",
      title: product.title,
      price,
      quantity: line.quantity,
      image: pickFeaturedImage(product.images) ?? { url: "", alt: "" },
    });
  }

  const inquiry = await Inquiry.create({
    inquiryNumber: generateInquiryNumber(),
    source: INQUIRY_SOURCE.MADE_TO_ORDER,

    contactName: input.contact.fullName.trim(),
    companyName: String(input.contact.companyName ?? "")
      .trim()
      .slice(0, MAX_COMPANY_NAME),
    email: input.contact.email.trim().toLowerCase(),
    phone: normalizePhone(input.contact.phone),
    customerId: input.customerId ?? null,

    // Pieces, not people — the units live on the lines below.
    headcount: 0,
    /** The dashboard's open-pipeline sum reads `budget`. */
    budget: value,

    message: String(input.notes ?? "")
      .trim()
      .slice(0, MAX_CORPORATE_NOTES),

    items,

    amounts: { subtotal: value, packaging: 0, card: 0, total: value },

    leadTimeDays: madeToOrderLeadDays(units),
  });

  return {
    inquiryId: String(inquiry._id),
    inquiryNumber: inquiry.inquiryNumber,
  };
}

/**
 * One line per product. The storefront's box already tops up rather than
 * duplicating, but a hand-built request could repeat an id — summed here so
 * the enquiry never shows the same piece twice.
 */
function mergeLines(lines) {
  const merged = new Map();

  for (const line of lines) {
    const existing = merged.get(line.productId);
    if (existing) existing.quantity += line.quantity;
    else merged.set(line.productId, { productId: line.productId, quantity: line.quantity });
  }

  return [...merged.values()];
}
