import mongoose from "mongoose";
import { cache } from "react";
import { connectDb } from "@/db/connect";
import { Banner } from "@/models/banner.model";

/**
 * Banner reads.
 *
 * No pagination: only one banner is live at a time and the list is a handful
 * of drafts beside it. A page control here would be scaffolding around a
 * screen nobody scrolls.
 */

/** Newest first, with the live one pulled to the top. */
export async function getBanners() {
  await connectDb();

  const docs = await Banner.find()
    .sort({ isActive: -1, updatedAt: -1 })
    .lean();

  return docs.map(toSummary);
}

export async function getBanner(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;

  await connectDb();

  const doc = await Banner.findById(id).lean();
  return doc ? toDetail(doc) : null;
}

/**
 * The storefront's single query, wrapped in `cache()` so the API route and
 * anything else in one request share the read.
 */
export const getActiveBanner = cache(async function getActiveBanner() {
  await connectDb();

  const doc = await Banner.findOne({ isActive: true }).lean();
  return doc ? toPublic(doc) : null;
});

function toSummary(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    isActive: Boolean(doc.isActive),
    desktop: toImage(doc.desktop),
    mobile: toImage(doc.mobile),
    updatedAt: doc.updatedAt,
  };
}

function toDetail(doc) {
  return {
    ...toSummary(doc),
    link: {
      type: doc.link?.type ?? "none",
      url: doc.link?.url ?? "",
      openInNewTab: Boolean(doc.link?.openInNewTab),
    },
    createdAt: doc.createdAt,
  };
}

/**
 * What the storefront gets: images and a destination, nothing else.
 *
 * The internal `name`, the timestamps and the admin ids are deliberately not
 * here — they are how staff tell two drafts apart, and none of it belongs in
 * a public response.
 */
function toPublic(doc) {
  return {
    desktop: toImage(doc.desktop),
    mobile: toImage(doc.mobile),
    link: {
      type: doc.link?.type ?? "none",
      url: doc.link?.url ?? "",
      openInNewTab: Boolean(doc.link?.openInNewTab),
    },
  };
}

function toImage(image) {
  if (!image?.url) return null;

  return {
    url: image.url,
    alt: image.alt ?? "",
    width: image.width ?? null,
    height: image.height ?? null,
  };
}
