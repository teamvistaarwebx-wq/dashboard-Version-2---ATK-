import { getCustomer } from "@/features/customers/queries/upsert-customer";
import { updateProfile } from "@/features/customers/queries/update-customer";
import { isInternalRequest, unauthorized } from "@/lib/internal-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

/** GET /api/customers/:id — internal. Backs the account page. */
export async function GET(request, { params }) {
  if (!isInternalRequest(request)) return unauthorized();

  try {
    const { id } = await params;
    const customer = await getCustomer(id);

    if (!customer) {
      return Response.json({ error: "Customer not found" }, { status: 404 });
    }

    return ok(customer);
  } catch (error) {
    console.error("GET /api/customers/[id] failed:", error);
    return serverError("Could not load customer");
  }
}

/**
 * PATCH /api/customers/:id — internal. Name and email only.
 *
 * Phone is not updatable: it is the identity, and a change would need a
 * fresh OTP against the new number.
 */
export async function PATCH(request, { params }) {
  if (!isInternalRequest(request)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  try {
    const { id } = await params;
    const result = await updateProfile(id, {
      fullName: body?.fullName,
      email: body?.email,
    });

    if (result.error) return badRequest(result.error);
    return ok(result.customer);
  } catch (error) {
    console.error("PATCH /api/customers/[id] failed:", error);
    return serverError("Could not update profile");
  }
}
