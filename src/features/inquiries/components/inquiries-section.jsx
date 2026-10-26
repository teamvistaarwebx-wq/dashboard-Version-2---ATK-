import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { InquiryStatusPill } from "./inquiry-status-pill";
import { formatCompactPrice, formatDateTime } from "@/lib/format";
import { INQUIRY_SOURCE, INQUIRY_SOURCE_LABEL } from "@/constants/enums";

/**
 * The enquiry table, split out of the page so it can stream.
 *
 * Takes the promise rather than the rows. The page starts the query and hands
 * the same promise to this and to the header's count, so the two render off
 * one read instead of two.
 */
export async function InquiriesSection({ inquiriesPromise, q, status, source }) {
  const { items, page, totalPages } = await inquiriesPromise;

  const isFiltered = Boolean(q || status || source);

  if (items.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title={isFiltered ? "No matching enquiries" : "No enquiries yet"}
          description={
            isFiltered
              ? "Try a different search or clear the filters."
              : "Enquiries sent from the storefront's Request a Quote buttons — the gift box and made-to-order products — land here."
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="relative mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="bg-surface font-nunito text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Enquiry</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">People / units</th>
              <th className="px-4 py-3 font-semibold">Est. value</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((inquiry) => (
              <tr key={inquiry.id} className="hover:bg-surface">
                <td className="px-4 py-3">
                  <Link
                    href={`/inquiries/${inquiry.id}`}
                    className="font-medium text-brand underline-offset-2 hover:underline"
                  >
                    {/* Enquiries typed up by sales carry no reference. */}
                    {inquiry.inquiryNumber ?? "View"}
                  </Link>
                  {inquiry.source === INQUIRY_SOURCE.MADE_TO_ORDER ? (
                    <span className="mt-1 block w-fit rounded-full border border-brand/30 bg-brand-tint px-2 py-0.5 font-nunito text-[0.625rem] font-semibold uppercase tracking-wide text-brand">
                      {INQUIRY_SOURCE_LABEL[inquiry.source]}
                    </span>
                  ) : null}
                  {inquiry.occasion ? (
                    <span className="block font-nunito text-xs text-muted">
                      {inquiry.occasion}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {/* Made-to-order requests can come from individuals. */}
                  {inquiry.companyName || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="block text-foreground">
                    {inquiry.contactName}
                  </span>
                  <span className="block font-nunito text-xs text-muted">
                    {inquiry.phone || inquiry.email || "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {inquiry.source === INQUIRY_SOURCE.MADE_TO_ORDER
                    ? `${inquiry.units} units`
                    : inquiry.headcount || "—"}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {inquiry.budget ? formatCompactPrice(inquiry.budget) : "—"}
                </td>
                <td className="px-4 py-3">
                  <InquiryStatusPill status={inquiry.status} />
                </td>
                <td className="px-4 py-3 font-nunito text-muted">
                  {formatDateTime(inquiry.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <p className="mt-4 font-nunito text-sm text-muted">
          Page {page} of {totalPages}
        </p>
      ) : null}
    </>
  );
}

/**
 * The count beside the heading. Its own component, off the same promise, so
 * the heading itself is not held back waiting for a number.
 */
export async function InquiriesCount({ inquiriesPromise }) {
  const { total } = await inquiriesPromise;

  return (
    <p className="font-nunito text-sm text-muted">
      {total} {total === 1 ? "enquiry" : "enquiries"}
    </p>
  );
}
