import mongoose from "mongoose";

/**
 * Curated sets (e.g. Wedding Edit 2026).
 * Source of truth for membership: Product.collections[]
 * (do not also store products[] here — avoids dual writes).
 */
const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
    startsAt: { type: Date },
    endsAt: { type: Date },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

collectionSchema.index({ isActive: 1, order: 1 });

export const Collection =
  mongoose.models.Collection ||
  mongoose.model("Collection", collectionSchema);
