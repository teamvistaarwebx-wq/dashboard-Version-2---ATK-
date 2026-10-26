import mongoose from "mongoose";
import { MOVEMENT_REASON_VALUES } from "@/constants/enums";

/** Immutable audit log of stock changes */
const stockMovementSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true, index: true },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      index: true,
    },
    delta: { type: Number, required: true },
    reason: {
      type: String,
      enum: MOVEMENT_REASON_VALUES,
      required: true,
    },
    note: { type: String, default: "" },
    refType: { type: String, default: "" },
    refId: { type: String, default: "" },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ sku: 1, createdAt: -1 });

export const StockMovement =
  mongoose.models.StockMovement ||
  mongoose.model("StockMovement", stockMovementSchema);
