import { cache } from "react";
import { connectDb } from "@/db/connect";
import { Banner } from "@/models/banner.model";
import { Inquiry } from "@/models/inquiry.model";
import { Order } from "@/models/order.model";
import { StockMovement } from "@/models/stock-movement.model";
/** Side-effect import: `.populate("productId")` needs it in the registry. */
import "@/models/product.model";
import { MOVEMENT_REASON, ORDER_STATUS } from "@/constants/enums";

const FEED_LENGTH = 8;
/** Read a few extra per source, since only the newest overall survive. */
const PER_SOURCE = FEED_LENGTH;

/**
 * One merged feed of what changed lately, across four collections.
 *
 * Merged in JS rather than with `$unionWith`: the four sources need different
 * joins and different sentence templates, and a union would force them into
 * one shape before any of that could happen.
 */
export const getRecentActivity = cache(async function getRecentActivity() {
  await connectDb();

  const [movements, banners, inquiries, orders] = await Promise.all([
    StockMovement.find({
      reason: { $in: [MOVEMENT_REASON.RESTOCK, MOVEMENT_REASON.SALE] },
    })
      .sort({ createdAt: -1 })
      .limit(PER_SOURCE)
      .populate({ path: "productId", select: "title" })
      .select("reason delta productId sku createdAt")
      .lean(),

    Banner.find({ isActive: true })
      .sort({ updatedAt: -1 })
      .limit(PER_SOURCE)
      .select("name updatedAt")
      .lean(),

    Inquiry.find({})
      .sort({ createdAt: -1 })
      .limit(PER_SOURCE)
      .select("contactName companyName headcount createdAt")
      .lean(),

    Order.find({
      status: { $in: [ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED] },
    })
      .sort({ updatedAt: -1 })
      .limit(PER_SOURCE)
      .select("orderNumber status contact.fullName updatedAt")
      .lean(),
  ]);

  const events = [
    ...movements.map((movement) => ({
      id: `movement-${movement._id}`,
      at: movement.createdAt,
      description:
        movement.reason === MOVEMENT_REASON.RESTOCK
          ? `${movement.productId?.title ?? movement.sku} restocked`
          : `${movement.productId?.title ?? movement.sku} sold`,
    })),

    ...banners.map((banner) => ({
      id: `banner-${banner._id}`,
      at: banner.updatedAt,
      description: `New banner "${banner.name}" published`,
    })),

    ...inquiries.map((inquiry) => ({
      id: `inquiry-${inquiry._id}`,
      at: inquiry.createdAt,
      description: inquiry.headcount
        ? `New inquiry from ${inquiry.contactName} (${inquiry.headcount} employees)`
        : `New inquiry from ${inquiry.contactName}`,
    })),

    ...orders.map((order) => ({
      id: `order-${order._id}`,
      at: order.updatedAt,
      description: `Order #${order.orderNumber} ${order.status} to ${
        order.contact?.fullName ?? "customer"
      }`,
    })),
  ];

  // toSorted, not sort: `events` is built fresh here, but returning a value
  // that was mutated in place is the habit that eventually bites.
  return events
    .toSorted((a, b) => b.at - a.at)
    .slice(0, FEED_LENGTH)
    .map((event) => ({
      id: event.id,
      description: event.description,
      // ISO string, not a Date — this crosses into a client component.
      at: event.at.toISOString(),
    }));
});
