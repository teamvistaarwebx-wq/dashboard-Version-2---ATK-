import { cache } from "react";
import { connectDb } from "@/db/connect";
import { Inquiry } from "@/models/inquiry.model";
import { INQUIRY_SOURCE, OPEN_INQUIRY_STATUS_VALUES } from "@/constants/enums";

const PANEL_SIZE = 3;

/**
 * The gifting-requests panel: the biggest open enquiries, plus what the whole
 * open pipeline is worth.
 *
 * The pipeline total covers every open enquiry, not just the three shown —
 * a figure that only added up the visible rows would be misleading.
 */
export const getOpenInquiries = cache(async function getOpenInquiries() {
  await connectDb();

  const filter = { status: { $in: OPEN_INQUIRY_STATUS_VALUES } };

  const [docs, totals] = await Promise.all([
    Inquiry.find(filter)
      .sort({ budget: -1, createdAt: -1 })
      .limit(PANEL_SIZE)
      .select("contactName companyName headcount budget status source items.quantity")
      .lean(),

    Inquiry.aggregate([
      { $match: filter },
      { $group: { _id: null, pipeline: { $sum: "$budget" }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    items: docs.map((doc) => ({
      id: String(doc._id),
      contactName: doc.contactName,
      companyName: doc.companyName,
      headcount: doc.headcount ?? 0,
      budget: doc.budget ?? 0,
      status: doc.status,
      madeToOrder: doc.source === INQUIRY_SOURCE.MADE_TO_ORDER,
      /** Pieces asked for — what a made-to-order line shows instead of people. */
      units: (doc.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0),
    })),
    pipeline: totals[0]?.pipeline ?? 0,
    openCount: totals[0]?.count ?? 0,
  };
});
