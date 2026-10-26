import mongoose from "mongoose";

/**
 * One row per (product, sku, warehouse).
 * - Non-variant products: sku = product.sku
 * - Variant products: sku = variants[].sku
 * Do NOT store `available` — compute: onHand - reserved
 */
const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sku: { type: String, required: true, trim: true, index: true },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    onHand: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, min: 0 },
  },
  { timestamps: true }
);

inventorySchema.virtual("available").get(function available() {
  return Math.max(0, (this.onHand || 0) - (this.reserved || 0));
});

inventorySchema.set("toJSON", { virtuals: true });
inventorySchema.set("toObject", { virtuals: true });

inventorySchema.index(
  { productId: 1, sku: 1, warehouse: 1 },
  { unique: true }
);

export const Inventory =
  mongoose.models.Inventory || mongoose.model("Inventory", inventorySchema);
