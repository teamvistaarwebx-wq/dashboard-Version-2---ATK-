import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { PRODUCT_STATUS } from "@/constants/enums";
import { formatPrice } from "@/lib/format";
import { DeleteProductButton } from "./delete-product-button";
import { StockPill } from "./stock-pill";

/**
 * The catalogue table.
 *
 * A server component: nothing in a row is interactive except the two action
 * controls, and only one of those needs state. Hoisted at module scope so the
 * icon elements are built once for the whole page, not once per row.
 */
const EDIT_ICON = <Pencil className="h-4 w-4" strokeWidth={2} />;
const DELETE_ICON = <Trash2 className="h-4 w-4" strokeWidth={2} />;

export function ProductsTable({
  items,
  canDelete,
  buildEditHref,
  showStock = true,
}) {
  return (
    <div className="relative overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[48rem] text-left text-sm">
        <thead className="border-b border-border bg-background font-nunito text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              Product
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Category
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Price
            </th>
            {showStock ? (
              <th scope="col" className="px-4 py-3 font-semibold">
                Stock
              </th>
            ) : null}
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {items.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              canDelete={canDelete}
              showStock={showStock}
              editHref={buildEditHref(product.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductRow({ product, canDelete, showStock, editHref }) {
  return (
    <tr className="transition hover:bg-background">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-background">
            {product.imageUrl ? (
              /**
               * A plain <img>, not next/image: these are 48px thumbnails on
               * an internal page, and next/image would need every storefront
               * host allow-listed in next.config.mjs to render them. Same
               * call as the enquiry detail page.
               *
               * Empty alt because the title sits right beside it — a screen
               * reader announcing it twice is noise, not information.
               */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt=""
                width={48}
                height={48}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <span className="truncate">{product.title}</span>

              {/* Only when it is NOT live. Without this a draft reads exactly
                  like something a customer can buy today. */}
              {product.status !== PRODUCT_STATUS.ACTIVE ? (
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-nunito text-[0.625rem] font-medium uppercase tracking-wide text-muted">
                  {product.status}
                </span>
              ) : null}
            </p>

            {product.subtitle ? (
              <p className="truncate font-nunito text-xs text-muted">
                {product.subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-foreground">{product.category || "—"}</td>

      <td className="px-4 py-3 font-medium text-foreground">
        {/* Variant products price from their cheapest active variant, so the
            figure is a floor rather than the price. */}
        {product.priceVaries ? "From " : ""}
        {formatPrice(product.price)}
      </td>

      {showStock ? (
        <td className="px-4 py-3">
          <StockPill inStock={product.inStock} />
        </td>
      ) : null}

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {/* Opens the drawer over this list, keeping the active filters —
              editing the third Saree lands back among the Sarees. */}
          <Link
            href={editHref}
            aria-label={`Edit ${product.title}`}
            className="rounded-md p-2 text-brand transition hover:bg-brand-soft"
          >
            {EDIT_ICON}
          </Link>

          {canDelete ? (
            <DeleteProductButton
              id={product.id}
              title={product.title}
              icon={DELETE_ICON}
            />
          ) : null}
        </div>
      </td>
    </tr>
  );
}
