import { cache } from "react";
import { connectDb } from "@/db/connect";
import { Order } from "@/models/order.model";
import { PAID_ORDER_STATUS_VALUES } from "@/constants/enums";
import { getIstDayWindow, IST_DATE, TIMEZONE } from "../lib/date-window";

export const SALES_WINDOW_DAYS = 7;

/**
 * Orders and revenue per day for the last seven days, oldest first.
 *
 * Mongo only returns days that saw an order, so the result is zero-filled
 * here — a quiet Wednesday still needs its bar, or the chart silently
 * reorders itself.
 */
export const getSalesByDay = cache(async function getSalesByDay() {
  await connectDb();

  const { start, days } = getIstDayWindow(SALES_WINDOW_DAYS);

  const rows = await Order.aggregate([
    {
      $match: {
        status: { $in: PAID_ORDER_STATUS_VALUES },
        createdAt: { $gte: start },
      },
    },
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: "$createdAt",
            unit: "day",
            timezone: TIMEZONE,
          },
        },
        orders: { $sum: 1 },
        revenue: { $sum: "$amounts.total" },
      },
    },
  ]);

  // One Map lookup per day, rather than scanning `rows` seven times.
  const byDay = new Map(
    rows.map((row) => [
      IST_DATE.format(row._id),
      { orders: row.orders, revenue: row.revenue },
    ])
  );

  return days.map(({ key, label }) => {
    const found = byDay.get(key);

    return {
      label,
      orders: found?.orders ?? 0,
      revenue: found?.revenue ?? 0,
    };
  });
});
