"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { GIFT_OPTION_TYPE } from "@/constants/enums";
import { toRupeeInput } from "@/features/catalog/lib/product-input";
import { DEFAULT_MESSAGE_LENGTH } from "../lib/gift-option-input";
import { saveGiftOption } from "../actions/save-gift-option";
import { GiftOptionImageField } from "./gift-option-image-field";

/**
 * Add / edit one packaging or card design.
 *
 * `type` is fixed for the form's life: chosen by the New button on create,
 * read from the record on edit. The two kinds differ by one field — a
 * message limit on cards, a capacity on packaging.
 *
 * `noValidate`, matching the other forms: the action returns every problem at
 * once, keyed by field.
 */
const INITIAL_STATE = { errors: {} };
const EMPTY = {};

export function GiftOptionForm({ option = EMPTY, type }) {
  const [state, formAction, isPending] = useActionState(
    saveGiftOption,
    INITIAL_STATE
  );

  const errors = state?.errors ?? EMPTY;
  const isCard = type === GIFT_OPTION_TYPE.CARD_DESIGN;
  const isNew = !option.id;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      {option.id ? <input type="hidden" name="id" value={option.id} /> : null}
      {isNew ? <input type="hidden" name="type" value={type} /> : null}

      <FormError message={errors._form} />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="gift-option-name"
              name="name"
              label="Name"
              required
              defaultValue={option.name ?? ""}
              error={errors.name}
              disabled={isPending}
              placeholder={isCard ? "Floral envelope" : "Classic kraft box"}
              hint="Shown to shoppers under the image."
            />

            <TextField
              id="gift-option-slug"
              name="slug"
              label="Slug"
              defaultValue={option.slug ?? ""}
              error={errors.slug}
              disabled={isPending}
              placeholder="Made from the name if left blank"
              hint="Lowercase and dashes. Unique within its type."
            />
          </div>

          <TextareaField
            id="gift-option-description"
            name="description"
            label="Description"
            rows={3}
            defaultValue={option.description ?? ""}
            error={errors.description}
            disabled={isPending}
            hint="Optional, up to 300 characters."
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              id="gift-option-price"
              name="price"
              label="Price (₹)"
              inputMode="decimal"
              defaultValue={option.id ? toRupeeInput(option.price) : ""}
              error={errors.price}
              disabled={isPending}
              placeholder="0"
              hint="0 shows as Free."
            />

            {isCard ? (
              <TextField
                id="gift-option-message-length"
                name="maxMessageLength"
                label="Message limit"
                inputMode="numeric"
                defaultValue={String(option.maxMessageLength ?? DEFAULT_MESSAGE_LENGTH)}
                error={errors.maxMessageLength}
                disabled={isPending}
                hint="Characters that fit on this card."
              />
            ) : (
              <TextField
                id="gift-option-capacity"
                name="capacity"
                label="Capacity"
                inputMode="numeric"
                defaultValue={option.capacity == null ? "" : String(option.capacity)}
                error={errors.capacity}
                disabled={isPending}
                placeholder="Not tracked"
                hint="Items this box holds."
              />
            )}

            <TextField
              id="gift-option-order"
              name="order"
              label="Position"
              inputMode="numeric"
              defaultValue={String(option.order ?? 0)}
              error={errors.order}
              disabled={isPending}
              hint="Lower shows first."
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex w-fit items-center gap-2 font-nunito text-sm text-foreground">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={isNew ? true : option.isActive}
                disabled={isPending}
                className="h-4 w-4 accent-brand"
              />
              Active
              <span className="text-xs text-muted">— shown on the cart</span>
            </label>
            {errors.isActive ? (
              <p role="alert" className="font-nunito text-xs text-danger">
                {errors.isActive}
              </p>
            ) : null}

            <label className="flex w-fit items-center gap-2 font-nunito text-sm text-foreground">
              <input
                type="checkbox"
                name="isDefault"
                defaultChecked={option.isDefault}
                disabled={isPending}
                className="h-4 w-4 accent-brand"
              />
              Default
              <span className="text-xs text-muted">
                — preselected on the cart; replaces the current default
              </span>
            </label>
            {errors.isDefault ? (
              <p role="alert" className="font-nunito text-xs text-danger">
                {errors.isDefault}
              </p>
            ) : null}
          </div>
        </div>

        <GiftOptionImageField
          defaultValue={option.image ?? ""}
          error={errors.image}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {isPending ? "Saving" : isCard ? "Save card design" : "Save packaging"}
        </Button>

        <Link
          href="/gift-options"
          className="font-nunito text-sm text-muted underline-offset-2 hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
