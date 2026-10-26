import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ProductsTable } from "./products-table";
import { buildProductsHref } from "@/features/catalog/lib/product-list-url";
import { STOCK_FILTER } from "@/constants/catalog-query";

/**
 * The part of /products that has to wait for Mongo.
 *
 * Split out of the page so it can sit behind its own Suspense boundary: the
 * heading, the "+ Add Product" button and the filter chips are all knowable
 * without touching the database, and holding them back until the table is
 * ready is what made every click on Products feel like the app had frozen.
 *
 * It takes the promise rather than the rows. The page starts the query and
 * hands it over unawaited, so the fetch is already in flight while React is
 * still rendering the header above it — awaiting in the page would put the two
 * back in sequence and give the boundary nothing to do.
 *
 * Shared with /made-to-order, which passes its own `basePath` and drops the
 * stock column — those pieces have no stock to show.
 */
export async function ProductsSection({
  productsPromise,
  q,
  subcategory,
  stock,
  canDelete,
  basePath = "/products",
  madeToOrder = false,
}) {
  const { items, total, page, totalPages } = await productsPromise;

  const isFiltered = Boolean(q || subcategory) || stock !== STOCK_FILTER.ALL;

  return (
    <>
      {items.length === 0 ? (
        <EmptyState
          title={
            isFiltered
              ? "No matching products"
              : madeToOrder
                ? "No made-to-order products yet"
                : "No products yet"
          }
          description={
            isFiltered
              ? madeToOrder
                ? "Try a different search, or clear the category filter."
                : "Try a different search, or clear the category and stock filters."
              : madeToOrder
                ? "Add a piece your artisans weave on request, and customers can ask for a quote on it."
                : "Add your first product and it will show up here."
          }
        />
      ) : (
        <ProductsTable
          items={items}
          canDelete={canDelete}
          showStock={!madeToOrder}
          // A function, not a string, because ProductsTable is a server
          // component — the pencil needs the row's id folded into the same
          // filter-preserving URL the pager builds.
          buildEditHref={(id) =>
            buildProductsHref({
              q,
              subcategory,
              stock,
              page,
              basePath,
              drawer: { edit: id },
            })
          }
        />
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        noun="product"
        buildHref={(target) =>
          buildProductsHref({ q, subcategory, stock, page: target, basePath })
        }
      />
    </>
  );
}
