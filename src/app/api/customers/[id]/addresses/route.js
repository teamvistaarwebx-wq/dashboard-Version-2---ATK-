import { addAddress } from "@/features/customers/queries/update-customer";
import { isInternalRequest, unauthorized } from "@/lib/internal-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

/** POST /api/customers/:id/addresses — internal. Adds a saved address. */
export async function POST(request, { params }) {
  if (!isInternalRequest(request)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  try {
    const { id } = await params;
    const result = await addAddress(id, body ?? {});

    if (result.error) return badRequest(result.error);
    return ok(result.customer);
  } catch (error) {
    console.error("POST /api/customers/[id]/addresses failed:", error);
    return serverError("Could not save address");
  }
}
