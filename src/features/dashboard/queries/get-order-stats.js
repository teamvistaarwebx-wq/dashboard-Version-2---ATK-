import { cache } from "react";
import { connectDb } from "@/db/connect";
import { Order } from "@/models/order.model";
import { PAID_ORDER_STATUS_VALUES } from "@/constants/enums";
import { getIstDayWindow } from "../lib/date-window";
import { SALES_WINDOW_DAYS } from "./get-sales-by-day";

/**
 * Headline order numbers, in one round trip.
 *
 * `$facet` rather than two queries: both branches scan the same paid-orders
 * index, and running them separately would double that work for no gain.
 *
 * Money is paise throughout — the caller formats.
 */
export const getOrderStats = cache(async function getOrderStats() {
  await connectDb();

  // Same window as the chart, so the "56 orders" figure above it always adds
  // up to the bars below it.
  const { start } = getIstDayWindow(SALES_WINDOW_DAYS);

  const [result] = await Order.aggregate([
    { $match: { status: { $in: PAID_ORDER_STATUS_VALUES } } },
    {
      $facet: {
        window: [
          { $match: { createdAt: { $gte: start } } },
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              revenue: { $sum: "$amounts.total" },
            },
          },
        ],
        allTime: [
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              revenue: { $sum: "$amounts.total" },
            },
          },
        ],
      },
    },
  ]);

  const recent = result?.window?.[0] ?? { orders: 0, revenue: 0 };
  const allTime = result?.allTime?.[0] ?? { orders: 0, revenue: 0 };

  return {
    windowDays: SALES_WINDOW_DAYS,
    orders: recent.orders,
    revenue: recent.revenue,
    // Rounded to whole paise: an average shown to the rupee gains nothing
    // from a fraction of a paisa.
    averageOrderValue:
      recent.orders > 0 ? Math.round(recent.revenue / recent.orders) : 0,
    totalRevenue: allTime.revenue,
    totalOrders: allTime.orders,
  };
});
