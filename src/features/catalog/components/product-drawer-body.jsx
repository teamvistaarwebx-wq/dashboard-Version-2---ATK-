import { ProductForm } from "./product-form";
import { getProductForForm } from "@/features/catalog/queries/get-product-for-form";

/**
 * The edit drawer's one blocking read.
 *
 * Only the edit case comes through here, and only because it has no choice:
 * every field in that form is a `defaultValue`, and there is no honest way to
 * render "Rust Orange Chanderi Silk Saree" into a text box before Mongo has
 * said what the product is called. So the whole form waits, behind a skeleton.
 *
 * "Add" does not go through this at all — the page renders ProductForm
 * directly, because a blank form has nothing to wait for. The category options
 * are not read here either: they are passed straight through as an unresolved
 * promise so the one field that needs them can suspend on its own, rather than
 * holding up the other thirty.
 */
export async function ProductDrawerBody({ editId, categoriesPromise }) {
  const editing = await getProductForForm(editId);

  // A stale ?edit= for something that has since been deleted. The panel opened
  // on the click, well before this read came back, so there is no longer the
  // option of quietly rendering nothing — say what happened instead of leaving
  // an empty drawer, or worse a blank "Add product" form, on screen.
  if (!editing) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
        <p className="text-center text-sm text-muted">
          This product has been deleted.
        </p>
      </div>
    );
  }

  return (
    <ProductForm product={editing} categoriesPromise={categoriesPromise} />
  );
}
