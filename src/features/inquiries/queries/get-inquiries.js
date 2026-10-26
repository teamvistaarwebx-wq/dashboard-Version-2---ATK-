import mongoose from "mongoose";
import { connectDb } from "@/db/connect";
import { Inquiry } from "@/models/inquiry.model";
import {
  INQUIRY_SOURCE_VALUES,
  INQUIRY_STATUS_VALUES,
} from "@/constants/enums";

const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Dashboard list. Newest first — the only order sales ever want. */
export async function getInquiries({ status, source, q, page, limit } = {}) {
  await connectDb();

  const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(
    Math.max(1, Number.parseInt(limit, 10) || PAGE_SIZE),
    MAX_PAGE_SIZE
  );

  const filter = {};
  if (INQUIRY_STATUS_VALUES.includes(status)) filter.status = status;
  if (INQUIRY_SOURCE_VALUES.includes(source)) filter.source = source;

  const query = String(q ?? "").trim();
  if (query) {
    // Sales search by reference, company, contact, phone or email.
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { inquiryNumber: new RegExp(safe, "i") },
      { companyName: new RegExp(safe, "i") },
      { contactName: new RegExp(safe, "i") },
      { phone: new RegExp(safe, "i") },
      { email: new RegExp(safe, "i") },
    ];
  }

  const [docs, total] = await Promise.all([
    Inquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean({ virtuals: true }),
    Inquiry.countDocuments(filter),
  ]);

  return {
    items: docs.map(toSummary),
    page: currentPage,
    limit: pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getInquiry(idOrNumber) {
  if (!idOrNumber) return null;

  await connectDb();

  const filter = mongoose.Types.ObjectId.isValid(idOrNumber)
    ? { _id: idOrNumber }
    : { inquiryNumber: String(idOrNumber).toUpperCase() };

  const doc = await Inquiry.findOne(filter).lean({ virtuals: true });
  return doc ? toDetail(doc) : null;
}

function toSummary(doc) {
  return {
    id: String(doc._id),
    /** Null on enquiries sales typed up by hand — the list falls back to the id. */
    inquiryNumber: doc.inquiryNumber ?? null,
    status: doc.status,
    source: doc.source,
    contactName: doc.contactName,
    companyName: doc.companyName,
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    headcount: doc.headcount ?? 0,
    /** Pieces asked for — the "People" column shows this for made to order. */
    units: (doc.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0),
    budget: doc.budget ?? 0,
    occasion: doc.occasion ?? "",
    neededBy: doc.neededBy ?? null,
    leadTimeDays: doc.leadTimeDays ?? null,
    createdAt: doc.createdAt,
  };
}

function toDetail(doc) {
  return {
    ...toSummary(doc),
    message: doc.message ?? "",
    items: doc.items ?? [],
    itemCount: (doc.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    packaging: doc.packaging ?? null,
    card: doc.card ?? null,
    cardMessage: doc.cardMessage ?? "",
    cardLogo: doc.cardLogo ?? null,
    address: doc.address ?? null,
    amounts: doc.amounts ?? null,
    // Mongo hands back a Map; the page just wants entries to render.
    categoryLimits: toPlainLimits(doc.categoryLimits),
    internalNotes: doc.internalNotes ?? "",
    updatedAt: doc.updatedAt,
  };
}

/** `.lean()` leaves a Map here, which does not survive to a client component. */
function toPlainLimits(limits) {
  if (!limits) return {};
  return limits instanceof Map ? Object.fromEntries(limits) : { ...limits };
}
