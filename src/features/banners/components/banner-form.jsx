"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import {
  BANNER_DESKTOP,
  BANNER_DESKTOP_RETINA,
  BANNER_MOBILE,
  MAX_BANNER_MB,
} from "@/constants/media";
import { saveBanner } from "../actions/save-banner";
import { BannerImageField } from "./banner-image-field";

/**
 * Add / edit a homepage banner.
 *
 * Two images, a name nobody outside this room sees, and where it goes. The
 * model also carries an overlay block — headline, CTA, text position — which
 * is deliberately not here: the artwork carries its own text today, and a
 * second way to put words on the hero is a second thing to keep in sync.
 *
 * `noValidate` on purpose, matching ProductForm: the browser's own bubbles
 * appear one at a time and cannot be styled. The action returns every problem
 * at once, keyed by field.
 */
const INITIAL_STATE = { errors: {} };
const EMPTY = {};

const LINK_TYPE_OPTIONS = [
  { value: "none", label: "Nothing — the banner is not clickable" },
  { value: "url", label: "Go to a link" },
];

export function BannerForm({ banner = EMPTY }) {
  const [state, formAction, isPending] = useActionState(
    saveBanner,
    INITIAL_STATE
  );

  const errors = state?.errors ?? EMPTY;

  const [linkType, setLinkType] = useState(banner.link?.type ?? "none");

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      {banner.id ? <input type="hidden" name="id" value={banner.id} /> : null}

      <FormError message={errors._form} />

      <TextField
        id="banner-name"
        name="name"
        label="Name"
        required
        defaultValue={banner.name ?? ""}
        error={errors.name}
        disabled={isPending}
        placeholder="Diwali 2026 hero"
        hint="Internal only — shoppers never see this."
        className="max-w-md"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <BannerImageField
          name="desktop"
          label="Desktop banner"
          defaultValue={banner.desktop ?? null}
          target={BANNER_DESKTOP}
          /* The desktop hero sits in a fixed-ratio box under object-cover;
             the mobile one renders at its natural height and never crops. */
          cropped
          error={errors.desktop}
          altError={errors.desktopAlt}
          disabled={isPending}
          hint={`Best size ${BANNER_DESKTOP_RETINA.width} × ${BANNER_DESKTOP_RETINA.height} (${BANNER_DESKTOP.width} × ${BANNER_DESKTOP.height} at 1×). WebP, up to ${MAX_BANNER_MB}MB.`}
        />

        <BannerImageField
          name="mobile"
          label="Mobile banner"
          defaultValue={banner.mobile ?? null}
          target={BANNER_MOBILE}
          error={errors.mobile}
          altError={errors.mobileAlt}
          disabled={isPending}
          hint={`Best size ${BANNER_MOBILE.width} × ${BANNER_MOBILE.height}. Any shape works — it is never cropped, only taller ones push the page down.`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <SelectField
          id="banner-link-type"
          name="linkType"
          label="When tapped"
          options={LINK_TYPE_OPTIONS}
          value={linkType}
          onValueChange={setLinkType}
          error={errors.linkType}
          disabled={isPending}
        />

        {/* Rendered only for "url": a URL box beside "Nothing" invites someone
            to fill it in and wonder why it does nothing. */}
        {linkType === "url" ? (
          <TextField
            id="banner-link-url"
            name="linkUrl"
            label="Link"
            required
            defaultValue={banner.link?.url ?? ""}
            error={errors.linkUrl}
            disabled={isPending}
            placeholder="/products?category=women"
            hint="A path on the store, or a full https:// address."
          />
        ) : null}
      </div>

      {linkType === "url" ? (
        <label className="flex w-fit items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="openInNewTab"
            defaultChecked={banner.link?.openInNewTab}
            disabled={isPending}
            className="h-4 w-4 accent-brand"
          />
          Open in a new tab
        </label>
      ) : null}

      <label className="flex w-fit items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={banner.isActive}
          disabled={isPending}
          className="h-4 w-4 accent-brand"
        />
        Publish this banner
        <span className="text-xs text-muted">
          — replaces whatever is live now
        </span>
      </label>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {isPending ? "Saving" : "Save banner"}
        </Button>

        <Link
          href="/banners"
          className="text-sm text-muted underline-offset-2 hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
