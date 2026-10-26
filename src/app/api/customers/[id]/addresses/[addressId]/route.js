import {
  deleteAddress,
  updateAddress,
} from "@/features/customers/queries/update-customer";
import { isInternalRequest, unauthorized } from "@/lib/internal-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

/** PATCH /api/customers/:id/addresses/:addressId — internal. */
export async function PATCH(request, { params }) {
  if (!isInternalRequest(request)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  try {
    const { id, addressId } = await params;
    const result = await updateAddress(id, addressId, body ?? {});

    if (result.error) return badRequest(result.error);
    return ok(result.customer);
  } catch (error) {
    console.error("PATCH address failed:", error);
    return serverError("Could not update address");
  }
}

/** DELETE /api/customers/:id/addresses/:addressId — internal. */
export async function DELETE(request, { params }) {
  if (!isInternalRequest(request)) return unauthorized();

  try {
    const { id, addressId } = await params;
    const result = await deleteAddress(id, addressId);

    if (result.error) return badRequest(result.error);
    return ok(result.customer);
  } catch (error) {
    console.error("DELETE address failed:", error);
    return serverError("Could not remove address");
  }
}
