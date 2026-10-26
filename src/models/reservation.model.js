import mongoose from "mongoose";
import {
  RESERVATION_STATUS,
  RESERVATION_STATUS_VALUES,
} from "@/constants/enums";

/** Held stock during checkout */
const reservationSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true, index: true },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      index: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    sessionId: { type: String, default: "", index: true },
    status: {
      type: String,
      enum: RESERVATION_STATUS_VALUES,
      default: RESERVATION_STATUS.ACTIVE,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

reservationSchema.index({ status: 1, expiresAt: 1 });

export const Reservation =
  mongoose.models.Reservation ||
  mongoose.model("Reservation", reservationSchema);
