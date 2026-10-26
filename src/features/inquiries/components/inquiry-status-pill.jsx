import { INQUIRY_STATUS } from "@/constants/enums";

/**
 * Where an enquiry sits in the pipeline.
 *
 * Shared by the list and the detail page so a status can never read one
 * colour on one screen and another elsewhere.
 */
const STATUS_STYLES = {
  [INQUIRY_STATUS.NEW]: "bg-brand-tint text-brand",
  [INQUIRY_STATUS.CONTACTED]: "bg-amber-100 text-amber-800",
  [INQUIRY_STATUS.QUOTED]: "bg-blue-100 text-blue-800",
  [INQUIRY_STATUS.WON]: "bg-emerald-100 text-emerald-800",
  [INQUIRY_STATUS.LOST]: "bg-gray-100 text-gray-500",
};

export function InquiryStatusPill({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}
