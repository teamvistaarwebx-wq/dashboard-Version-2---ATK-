import { upsertCustomer } from "@/features/customers/queries/upsert-customer";
import { isInternalRequest, unauthorized } from "@/lib/internal-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

/**
 * POST /api/customers/upsert — internal.
 *
 * Guest checkout and login both land here, which is what lets a guest order
 * and a later sign-in resolve to the same customer.
 */
export async function POST(request) {
  if (!isInternalRequest(request)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  try {
    const result = await upsertCustomer({
      phone: body?.phone,
      fullName: String(body?.fullName ?? ""),
      email: String(body?.email ?? ""),
      via: body?.via === "login" ? "login" : "checkout",
      touchLogin: Boolean(body?.touchLogin),
    });

    if (result.error) return badRequest(result.error);

    return ok(result.customer);
  } catch (error) {
    console.error("POST /api/customers/upsert failed:", error);
    return serverError("Could not save customer");
  }
}
