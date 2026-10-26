"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { connectDb } from "@/db/connect";
import { GiftOption } from "@/models/gift-option.model";
import { GIFT_OPTION_TYPE_VALUES } from "@/constants/enums";
import { parseGiftOptionForm } from "@/features/gift-options/lib/gift-option-input";
import { revalidateStorefront } from "@/lib/revalidate-storefront";
import { requireAdmin } from "@/lib/auth/dal";

/**
 * Creates or updates one packaging or card design.
 *
 * One action for both, like saveBanner: a present `id` is the only
 * difference. Authorised in here — a server action is a public endpoint.
 *
 * Returns `{ errors }` keyed by field so each message prints under its input.
 */
export async function saveGiftOption(_prevState, formData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const isUpdate = Boolean(id);

  if (isUpdate && !mongoose.Types.ObjectId.isValid(id)) {
    return { errors: { _form: "That option no longer exists." } };
  }

  await connectDb();

  const existing = isUpdate ? await GiftOption.findById(id) : null;
  if (isUpdate && !existing) {
    return { errors: { _form: "That option no longer exists." } };
  }

  // Locked after creation — see parseGiftOptionForm.
  const type = existing ? existing.type : String(formData.get("type") ?? "");
  if (!GIFT_OPTION_TYPE_VALUES.includes(type)) {
    return { errors: { _form: "Choose packaging or card design." } };
  }

  const parsed = parseGiftOptionForm(formData, {
    type,
    previousImage: existing?.image ?? "",
  });
  if (parsed.errors) return { errors: parsed.errors };

  const { values } = parsed;

  // The model would quietly re-activate a default; saying so is kinder than
  // a checkbox that un-ticks itself.
  if (values.isDefault && !values.isActive) {
    return {
      errors: {
        isActive: "The default must be active — tick Active, or untick Default.",
      },
    };
  }

  // Taking the flag off the current default would leave the cart falling
  // back to whichever option sorts first. Make another one default instead.
  if (existing?.isDefault && !values.isDefault) {
    return {
      errors: {
        isDefault:
          "This is the default. Make another option the default from the list instead.",
      },
    };
  }

  try {
    /**
     * new + save() and load + save(), never findOneAndUpdate: the one-default
     * rule lives in `pre("save")`, which query updates skip.
     */
    if (existing) {
      for (const [key, value] of Object.entries(values)) {
        existing.set(key, value);
      }
      await existing.save();
    } else {
      await new GiftOption({ ...values, type }).save();
    }
  } catch (error) {
    if (error?.code === 11000) {
      return { errors: { slug: "Another option of this type already uses this slug." } };
    }
    if (error?.name === "ValidationError") {
      const first = Object.values(error.errors ?? {})[0];
      return { errors: { _form: first?.message ?? "Some fields need another look." } };
    }
    throw error;
  }

  revalidatePath("/gift-options");
  // Every change shows on the cart — even an inactive edit can matter once
  // it is switched back on — so the storefront always drops its copy.
  await revalidateStorefront("gift-options");

  redirect("/gift-options");
}
