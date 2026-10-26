import mongoose from "mongoose";
import { connectDb } from "@/db/connect";
import { Order } from "@/models/order.model";
import { ORDER_STATUS_VALUES } from "@/constants/enums";

const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Dashboard list. Newest first — the only order staff ever want.
 *
 * `from` / `to` are inclusive IST calendar days ("2026-10-25"). Each bound is
 * turned into the instant that IST day starts, using the fixed +05:30 offset
 * (the same rule as getIstDayWindow), so "Today" means today in India and not
 * the server's UTC date. `to` is exclusive of the following midnight.
 */
export async function getOrders({ status, q, page, limit, from, to } = {}) {
  await connectDb();

  const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(
    Math.max(1, Number.parseInt(limit, 10) || PAGE_SIZE),
    MAX_PAGE_SIZE
  );

  const filter = {};
  if (ORDER_STATUS_VALUES.includes(status)) filter.status = status;

  const createdAt = {};
  if (isDayKey(from)) createdAt.$gte = new Date(`${from}T00:00:00+05:30`);
  if (isDayKey(to)) {
    const end = new Date(`${to}T00:00:00+05:30`);
    end.setUTCDate(end.getUTCDate() + 1);
    createdAt.$lt = end;
  }
  if (Object.keys(createdAt).length) filter.createdAt = createdAt;

  const query = String(q ?? "").trim();
  if (query) {
    // Staff search by order number, phone or email — anchored so the index
    // on contact.phone can still help.
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { orderNumber: new RegExp(safe, "i") },
      { "contact.phone": new RegExp(safe, "i") },
      { "contact.email": new RegExp(safe, "i") },
    ];
  }

  const [docs, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean({ virtuals: true }),
    Order.countDocuments(filter),
  ]);

  return {
    items: docs.map(toSummary),
    page: currentPage,
    limit: pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

function isDayKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function getOrder(idOrNumber) {
  if (!idOrNumber) return null;

  await connectDb();

  const filter = mongoose.Types.ObjectId.isValid(idOrNumber)
    ? { _id: idOrNumber }
    : { orderNumber: String(idOrNumber).toUpperCase() };

  const doc = await Order.findOne(filter).lean({ virtuals: true });
  return doc ? toDetail(doc) : null;
}

function toSummary(doc) {
  return {
    id: String(doc._id),
    orderNumber: doc.orderNumber,
    status: doc.status,
    contact: doc.contact,
    itemCount: (doc.items ?? []).reduce((sum, i) => sum + i.quantity, 0),
    total: doc.amounts?.total ?? 0,
    currency: doc.currency || "INR",
    createdAt: doc.createdAt,
  };
}

function toDetail(doc) {
  return {
    ...toSummary(doc),
    address: doc.address,
    items: doc.items ?? [],
    packaging: doc.packaging ?? null,
    card: doc.card ?? null,
    cardMessage: doc.cardMessage ?? "",
    cardLogo: doc.cardLogo ?? null,
    amounts: doc.amounts,
    payment: {
      provider: doc.payment?.provider ?? "razorpay",
      razorpayOrderId: doc.payment?.razorpayOrderId ?? null,
      razorpayPaymentId: doc.payment?.razorpayPaymentId ?? null,
      paidAt: doc.payment?.paidAt ?? null,
      failureReason: doc.payment?.failureReason ?? "",
    },
    verifiedPhone: doc.verifiedPhone ?? "",
    /**
     * Set when the payment landed after the stock hold had expired, so the
     * item may already have gone to somebody else. The detail page shows it as
     * an alert — this is a paying customer waiting on a phone call.
     */
    needsReview: Boolean(doc.needsReview),
    reviewNote: doc.reviewNote ?? "",
    updatedAt: doc.updatedAt,
  };
}
