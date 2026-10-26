/**
 * Whether a product can be sold right now.
 *
 * Two states, not three: the number behind it is `onHand - reserved` summed
 * across warehouses, and a count on this screen would invite staff to treat
 * the catalogue table as the inventory screen. See get-admin-products.js.
 */
export function StockPill({ inStock }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 font-nunito text-xs font-medium ${
        inStock ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
      }`}
    >
      {inStock ? "In Stock" : "Sold Out"}
    </span>
  );
}
