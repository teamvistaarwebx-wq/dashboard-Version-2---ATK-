import { cache } from "react";
import { connectDb } from "@/db/connect";
import { AdminUser } from "@/models/admin-user.model";

/**
 * The team list for Settings. Credentials are `select: false` on the schema,
 * so nothing sensitive can ride along into the client component's props even
 * by accident.
 */
export const getAdminUsers = cache(async function getAdminUsers() {
  await connectDb();

  const docs = await AdminUser.find({})
    .sort({ createdAt: -1 })
    .select("email fullName role status lastLoginAt createdAt")
    .lean();

  return docs.map((doc) => ({
    id: String(doc._id),
    email: doc.email,
    fullName: doc.fullName ?? "",
    role: doc.role,
    status: doc.status,
    lastLoginAt: doc.lastLoginAt ? doc.lastLoginAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
  }));
});
