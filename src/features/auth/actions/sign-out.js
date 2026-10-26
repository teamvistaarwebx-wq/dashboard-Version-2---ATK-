"use server";

import { redirect } from "next/navigation";
import { destroySession, getSession } from "@/lib/auth/session";

/**
 * Clears the cookie even when the JWT is already invalid — a stale session
 * must still be able to sign out. `getSession()` is the DAL read; it never
 * throws, so a bad cookie cannot trap someone on a 403.
 */
export async function signOut() {
  await getSession();
  await destroySession();
  redirect("/login");
}
