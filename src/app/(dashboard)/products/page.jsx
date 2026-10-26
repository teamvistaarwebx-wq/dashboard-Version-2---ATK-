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
import {
  normalizePage,
  normalizeStockFilter,
} from "@/constants/catalog-query";
import { CATALOG_DESTRUCTIVE_ROLES } from "@/constants/enums";
import { requireAdmin } from "@/lib/auth/dal";
import { ProductsScreen } from "@/features/catalog/components/products-screen";
import { MOCK_MODE } from "@/lib/mock-mode";

export const metadata = { title: "Products | AKT Gifting Admin" };

/**
 * Built on the server so `lucide-react` never reaches the client bundle — the
 * filter bar is a client component, but an already-rendered element crossing
 * the boundary carries no import with it.
 */
const SEARCH_ICON = <Search className="h-4 w-4" strokeWidth={2} />;

/**
 * The catalogue.
 *
 * Calls the queries directly rather than its own /api/products — it runs
 * inside the app that owns the model, so a network round trip would buy
 * nothing. Same reasoning as the Orders and Inquiries lists.
 *
 * Nothing below is awaited in this function. The queries are *started* here so
 * they overlap, and the promises are handed to components sitting behind
 * Suspense boundaries — so the heading, the "+ Add Product" button and the
 * page frame reach the browser while Mongo is still working. Awaiting them
 * here, as this page used to, meant the router had nothing at all to show
 * until the slowest read finished, and a click on Products looked like the app
 * had locked up.
 */
export default async function ProductsPage({ searchParams }) {
  if (MOCK_MODE) {
    return (
      <Suspense>
        <ProductsScreen />
      </Suspense>
    );
  }

  const session = await requireAdmin();

  const params = await searchParams;
  const q = params?.q ?? "";
  const subcategory = params?.subcategory ?? "";
  const stock = normalizeStockFilter(params?.stock);

  /**
   * Normalised here rather than read back off the query result, because the
   * "+ Add Product" link is built before that result exists. This is the same
   * function getAdminProducts() applies internally, so the two cannot drift.
   */
  const page = normalizePage(params?.page);

  // Which drawer is open, if any. Kept in the URL so Back closes it.
  const editId = params?.edit ?? "";
  const isDrawerOpen = Boolean(editId) || params?.new === "1";

  // Started, deliberately not awaited. Both are already in flight by the time
  // React renders the header, and the chips never wait on the table.
  const productsPromise = getAdminProducts({
    q,
    subcategory,
    stock,
    page: params?.page,
  });
  const subcategoriesPromise = getProductFilters();

  /**
   * Started here, resolved in the browser. The drawer's only remaining read —
   * the Category select's options, which have to come from Mongo because they
   * post a subcategory id. Starting it at the top of the render is most of the
   * point: it is in flight while React builds the page around it.
   *
   * Handed to the form as a promise rather than a value. Awaiting it up here
   * would put every field in the drawer behind it, which is exactly the wait
   * this is meant to remove.
   *
   * Conditional because it must not run on a page with no drawer open — most
   * visits to /products never open one.
   */
  const categoriesPromise = isDrawerOpen ? getProductCategoryOptions() : null;

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Add products, update photos and details, and mark items sold out."
      >
        <Link
          href={buildProductsHref({
            q,
            subcategory,
            stock,
            page,
            drawer: { new: "1" },
          })}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          + Add Product
        </Link>
      </PageHeader>

      <div className="px-6 py-6 sm:px-8">
        {/* Two nested boundaries, because the two reads are not the same size:
            the chips are seven rows and land almost immediately, while the
            table joins Inventory and counts the whole filtered set. Nesting
            lets the chips paint the moment they are ready instead of waiting
            on the table they sit above. */}
        <Suspense
          fallback={
            <>
              <FilterBarSkeleton />
              <div className="mt-6">
                <TableSkeleton rows={8} columns={5} />
              </div>
            </>
          }
        >
          <FilteredProducts
            subcategoriesPromise={subcategoriesPromise}
            q={q}
            subcategory={subcategory}
            stock={stock}
          >
            <Suspense fallback={<TableSkeleton rows={8} columns={5} />}>
              <ProductsSection
                productsPromise={productsPromise}
                q={q}
                subcategory={subcategory}
                stock={stock}
                canDelete={CATALOG_DESTRUCTIVE_ROLES.includes(session.role)}
              />
            </Suspense>
          </FilteredProducts>
        </Suspense>
      </div>

      {/* Nothing above this line is awaited, so the panel — chrome the page can
          build from the URL alone — reaches the browser about as fast as the
          session cookie can be verified, and opens on the click rather than on
          the database.

          What goes inside it splits by which drawer this is, because the two
          are not the same problem:

          "Add" has no product to read. The form renders immediately, in full,
          and only its Category select waits — so there is no boundary here at
          all, just a form that happens to contain one small one.

          "Edit" has to wait for one read, and honestly: every field in that
          form is a `defaultValue`, and there is nothing to put in them until
          Mongo says what the product is called. That is what the skeleton is
          for. */}
      {isDrawerOpen ? (
        <ProductDrawer title={editId ? "Edit product" : "Add product"}>
          {editId ? (
            <Suspense fallback={<ProductFormSkeleton />}>
              <ProductDrawerBody
                editId={editId}
                categoriesPromise={categoriesPromise}
              />
            </Suspense>
          ) : (
            <ProductForm categoriesPromise={categoriesPromise} />
          )}
        </ProductDrawer>
      ) : null}
    </>
  );
}

/**
 * Supplies the chip row its categories.
 *
 * A wrapper rather than an await in the page, so that `children` — the table,
 * with its own query already running — is an element that exists before this
 * resolves. That is what keeps the two reads parallel instead of stacking them
 * into a waterfall.
 */
async function FilteredProducts({
  subcategoriesPromise,
  q,
  subcategory,
  stock,
  children,
}) {
  const subcategories = await subcategoriesPromise;

  return (
    <ProductFilters
      q={q}
      subcategory={subcategory}
      stock={stock}
      subcategories={subcategories}
      searchIcon={SEARCH_ICON}
    >
      {children}
    </ProductFilters>
  );
}
