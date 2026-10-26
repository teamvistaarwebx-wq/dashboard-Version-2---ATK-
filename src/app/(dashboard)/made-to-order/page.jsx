import { Suspense } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBarSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { ProductDrawer } from "@/features/catalog/components/product-drawer";
import { ProductDrawerBody } from "@/features/catalog/components/product-drawer-body";
import { ProductFilters } from "@/features/catalog/components/product-filters";
import { ProductForm } from "@/features/catalog/components/product-form";
import { ProductFormSkeleton } from "@/features/catalog/components/product-form-skeleton";
import { ProductsSection } from "@/features/catalog/components/products-section";
import { getAdminProducts } from "@/features/catalog/queries/get-admin-products";
import { getProductFilters } from "@/features/catalog/queries/get-product-filters";
import { getProductCategoryOptions } from "@/features/catalog/queries/get-product-category-options";
import { buildProductsHref } from "@/features/catalog/lib/product-list-url";
import { STOCK_FILTER, normalizePage } from "@/constants/catalog-query";
import { CATALOG_DESTRUCTIVE_ROLES, FULFILLMENT } from "@/constants/enums";
import { requireAdmin } from "@/lib/auth/dal";
import { MadeToOrderScreen } from "@/features/catalog/components/made-to-order-screen";
import { MOCK_MODE } from "@/lib/mock-mode";

export const metadata = { title: "Made to Order | AKT Gifting Admin" };

const SEARCH_ICON = <Search className="h-4 w-4" strokeWidth={2} />;

const BASE_PATH = "/made-to-order";

/**
 * The made-to-order catalogue — pieces woven once a customer commits to a
 * quantity.
 *
 * The Products screen over the other half of the catalogue: same table, same
 * drawer, same form, scoped by `fulfillment`. What is missing is on purpose —
 * there is no stock column, no stock filter and no opening stock, because
 * nothing here is ever counted. Quote requests for these land in Inquiries.
 *
 * Built exactly like products/page.jsx: every query is started here and
 * awaited only behind a Suspense boundary, so the header and the Add button
 * reach the browser while Mongo is still working.
 */
export default async function MadeToOrderPage({ searchParams }) {
  if (MOCK_MODE) {
    return (
      <Suspense>
        <MadeToOrderScreen />
      </Suspense>
    );
  }

  const session = await requireAdmin();

  const params = await searchParams;
  const q = params?.q ?? "";
  const subcategory = params?.subcategory ?? "";
  const page = normalizePage(params?.page);

  const editId = params?.edit ?? "";
  const isDrawerOpen = Boolean(editId) || params?.new === "1";

  const productsPromise = getAdminProducts({
    q,
    subcategory,
    page: params?.page,
    fulfillment: FULFILLMENT.MADE_TO_ORDER,
  });
  const subcategoriesPromise = getProductFilters();
  const categoriesPromise = isDrawerOpen ? getProductCategoryOptions() : null;

  return (
    <>
      <PageHeader
        title="Made to Order"
        subtitle="Pieces woven on request. No stock — customers ask for a quote and your team follows up."
      >
        <Link
          href={buildProductsHref({
            q,
            subcategory,
            page,
            basePath: BASE_PATH,
            drawer: { new: "1" },
          })}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          + Add Product
        </Link>
      </PageHeader>

      <div className="px-6 py-6 sm:px-8">
        <Suspense
          fallback={
            <>
              <FilterBarSkeleton />
              <div className="mt-6">
                <TableSkeleton rows={8} columns={4} />
              </div>
            </>
          }
        >
          <FilteredProducts
            subcategoriesPromise={subcategoriesPromise}
            q={q}
            subcategory={subcategory}
          >
            <Suspense fallback={<TableSkeleton rows={8} columns={4} />}>
              <ProductsSection
                productsPromise={productsPromise}
                q={q}
                subcategory={subcategory}
                stock={STOCK_FILTER.ALL}
                basePath={BASE_PATH}
                madeToOrder
                canDelete={CATALOG_DESTRUCTIVE_ROLES.includes(session.role)}
              />
            </Suspense>
          </FilteredProducts>
        </Suspense>
      </div>

      {isDrawerOpen ? (
        <ProductDrawer
          title={editId ? "Edit made-to-order product" : "Add made-to-order product"}
        >
          {editId ? (
            <Suspense fallback={<ProductFormSkeleton />}>
              <ProductDrawerBody
                editId={editId}
                categoriesPromise={categoriesPromise}
              />
            </Suspense>
          ) : (
            <ProductForm
              categoriesPromise={categoriesPromise}
              fulfillment={FULFILLMENT.MADE_TO_ORDER}
            />
          )}
        </ProductDrawer>
      ) : null}
    </>
  );
}

/** Same wrapper as products/page.jsx — keeps the chip read and the table read parallel. */
async function FilteredProducts({ subcategoriesPromise, q, subcategory, children }) {
  const subcategories = await subcategoriesPromise;

  return (
    <ProductFilters
      q={q}
      subcategory={subcategory}
      stock={STOCK_FILTER.ALL}
      subcategories={subcategories}
      searchIcon={SEARCH_ICON}
      showStock={false}
    >
      {children}
    </ProductFilters>
  );
}
