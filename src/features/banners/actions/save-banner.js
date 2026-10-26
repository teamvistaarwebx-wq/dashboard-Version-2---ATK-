"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { connectDb } from "@/db/connect";
import { Banner } from "@/models/banner.model";
import { parseBannerForm } from "@/features/banners/lib/banner-input";
import { revalidateStorefront } from "@/lib/revalidate-storefront";
import { requireAdmin } from "@/lib/auth/dal";

/**
 * Creates or updates the homepage banner.
 *
 * One action for both, like saveProduct: the parsing and validation are
 * identical and a present `id` is the only difference.
 *
 * Authorised in here rather than only behind the page — a server action is a
 * public endpoint and can be called directly.
 *
 * Returns `{ errors }` keyed by field so each message prints under the input
 * that caused it.
 */
export async function saveBanner(_prevState, formData) {
  const session = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const isUpdate = Boolean(id);

  if (isUpdate && !mongoose.Types.ObjectId.isValid(id)) {
    return { errors: { _form: "That banner no longer exists." } };
  }

  const parsed = parseBannerForm(formData);
  if (parsed.errors) return { errors: parsed.errors };

  const { values } = parsed;

  await connectDb();

  try {
    /**
     * new + save() and load + save(), never findOneAndUpdate.
     *
     * Both of this model's rules live in document middleware: `pre("validate")`
     * normalises the link block, and `pre("save")` is what deactivates every
     * other banner when this one goes live. Query middleware does not run
     * either, so an update through findOneAndUpdate would quietly leave two
     * active banners and let the storefront pick whichever it found first.
     */
    if (isUpdate) {
      const banner = await Banner.findById(id);
      if (!banner) return { errors: { _form: "That banner no longer exists." } };

      for (const [key, value] of Object.entries(values)) {
        banner.set(key, value);
      }
      banner.set("updatedBy", session.adminId);
      await banner.save();
    } else {
      await new Banner({
        ...values,
        createdBy: session.adminId,
        updatedBy: session.adminId,
      }).save();
    }
  } catch (error) {
    const message = toFormError(error);
    if (message) return { errors: { _form: message } };
    throw error;
  }

  revalidatePath("/banners");

  // Only worth a round trip when this save changed what shoppers see. A draft
  // saved as a draft is invisible to them.
  if (values.isActive) await revalidateStorefront("banners");

  redirect("/banners");
}

/**
 * The model's hooks throw plain Errors and Mongoose wraps field rules in a
 * ValidationError. Both carry something worth showing; anything else is a real
 * bug and should reach the error boundary rather than be flattened into a
 * form message.
 */
function toFormError(error) {
  if (error?.name === "ValidationError") {
    const first = Object.values(error.errors ?? {})[0];
    return first?.message ?? "Some fields need another look.";
  }

  if (error instanceof Error && error.message.startsWith("link.")) {
    return error.message;
  }

  return null;
}
