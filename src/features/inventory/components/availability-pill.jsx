/**
 * What a SKU's availability means at a glance.
 *
 * Four states, not two. "Oversold" exists because the ledger deliberately lets
 * availability go negative when a payment lands after its hold expired — that
 * is somebody who has paid for something we do not have, and it must not look
 * the same as an ordinary sold-out row.
 */
export function AvailabilityPill({
  available,
  threshold,
  allowBackorder,
  hasStockRecord = true,
}) {
  const { label, className } = describe(
    available,
    threshold,
    allowBackorder,
    hasStockRecord
  );

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 font-nunito text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function describe(available, threshold, allowBackorder, hasStockRecord) {
  if (available < 0) {
    return { label: "Oversold", className: "bg-red-600 text-white" };
  }

  /**
   * Never counted, as opposed to counted and gone. Both read zero and both
   * mean nobody can buy it, but one is an oversight and the other is a sales
   * problem — and they need different actions from whoever is looking.
   */
  if (!hasStockRecord) {
    return { label: "Not stocked", className: "bg-gray-200 text-gray-700" };
  }

  if (available === 0) {
    return allowBackorder
      ? { label: "On backorder", className: "bg-amber-100 text-amber-800" }
      : { label: "Sold Out", className: "bg-red-100 text-red-700" };
  }

  if (available <= threshold) {
    return { label: "Low stock", className: "bg-amber-100 text-amber-800" };
  }

  return { label: "In Stock", className: "bg-emerald-100 text-emerald-800" };
}
