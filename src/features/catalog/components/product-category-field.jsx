"use client";

import { use } from "react";
import { SelectField } from "@/components/ui/select-field";

/**
 * The one field in the product drawer that Mongo still has to answer for.
 *
 * Everything else is drawable the instant the panel opens — every text box,
 * every checkbox, the photo uploader, and now the type and colour menus too,
 * which come from constants/product-vocabulary.js rather than the database.
 * This one cannot be: it posts a subcategory ObjectId, and only Mongo knows
 * what those are.
 *
 * It takes the *promise* rather than the resolved list, which is the point: the
 * page starts that query and passes it unresolved across the server/client
 * boundary, so it is already in flight while the form around it renders.
 * Handing down an awaited value would put the whole form back behind the query.
 */
export function CategorySelect({
  categoriesPromise,
  defaultValue,
  error,
  disabled,
}) {
  const categories = use(categoriesPromise);

  // Grouped by category — "Other Collection" exists under both Women and Men.
  const options = categories.map((category) => ({
    label: category.name,
    options: category.subcategories.map((sub) => ({
      value: sub.id,
      label: sub.name,
    })),
  }));

  return (
    <SelectField
      id="product-subcategory"
      name="subcategory"
      label="Category"
      options={options}
      defaultValue={defaultValue}
      placeholder="Choose…"
      error={error}
      required
      disabled={disabled}
    />
  );
}

/**
 * What stands in for it meanwhile.
 *
 * The real label, not a grey bar where the label goes — the field is only
 * missing its options, and saying "Category" while they arrive reads as a field
 * loading rather than as a hole in the form.
 *
 * Its own three lines instead of an import from components/ui/skeleton, which
 * is deliberately server-only: that file promises it costs no client
 * JavaScript, and pulling it into this module would quietly make that false.
 */
export function FieldSkeleton({ label }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-nunito text-xs font-semibold text-foreground">
        {label}
      </span>
      <div
        className="h-11 animate-pulse rounded-lg bg-border/60"
        aria-hidden="true"
      />
    </div>
  );
}
