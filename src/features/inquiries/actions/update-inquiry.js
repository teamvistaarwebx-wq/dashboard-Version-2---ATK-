"use server";

import { revalidatePath } from "next/cache";
import { connectDb } from "@/db/connect";
import { Inquiry } from "@/models/inquiry.model";
import { INQUIRY_STATUS_VALUES } from "@/constants/enums";
import { requireAdmin } from "@/lib/auth/dal";

/** Matches the cap on Order.internalNotes usage — a note, not a document. */
const MAX_INTERNAL_NOTES = 2000;

/**
 * Moves an enquiry along the pipeline and saves the team's notes.
 *
 * Authorised inside the action, not just behind the page: a server action is
 * a public endpoint and can be called directly (same reasoning as
 * inviteAdminUser).
 */
export async function updateInquiry(_prevState, formData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const internalNotes = String(formData.get("internalNotes") ?? "").slice(
    0,
    MAX_INTERNAL_NOTES
  );

  if (!id) return { error: "Missing enquiry" };
  if (!INQUIRY_STATUS_VALUES.includes(status)) return { error: "Pick a status" };

  await connectDb();

  const updated = await Inquiry.findByIdAndUpdate(
    id,
    { $set: { status, internalNotes } },
    { new: true }
  ).catch(() => null);

  if (!updated) return { error: "That enquiry no longer exists" };

  // The list shows status, and the dashboard's open pipeline counts it.
  revalidatePath("/inquiries");
  revalidatePath(`/inquiries/${id}`);
  revalidatePath("/");

  return { ok: true, savedAt: Date.now() };
}
