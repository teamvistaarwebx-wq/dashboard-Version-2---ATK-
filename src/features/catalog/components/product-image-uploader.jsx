"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import {
  IMAGE_ACCEPT,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
  MAX_PRODUCT_IMAGES,
} from "@/constants/media";

/**
 * Product photos, uploaded straight to Cloudflare R2.
 *
 * The bytes never pass through our server: we ask an authenticated route for a
 * one-shot signed URL, then PUT the file to R2 from here. A server action would
 * cap the request body at 1MB, and raising that would still stream every photo
 * through the Next process.
 *
 * The resulting list posts as one hidden JSON field. Position is list order and
 * the first image is the featured one, which is also what the model enforces.
 */

export function ProductImageUploader({
  defaultValue = [],
  error = "",
  disabled = false,
}) {
  const [images, setImages] = useState(defaultValue);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef(null);

  async function uploadOne(file) {
    // Checked here as well as on the server: a presigned PUT cannot enforce a
    // size, so stopping it before the upload starts is the only way the person
    // finds out before waiting for it.
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`"${file.name}" is over ${MAX_IMAGE_MB}MB.`);
    }

    const signed = await fetch("/api/uploads/product-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type, size: file.size }),
    });

    const payload = await signed.json().catch(() => ({}));
    if (!signed.ok) throw new Error(payload.error ?? "Could not start the upload");

    const { uploadUrl, publicUrl } = payload.data;

    // The Content-Type is part of the signature — send anything else and R2
    // rejects it. A failure here with no status is almost always the bucket's
    // CORS policy, not the credentials.
    const put = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!put.ok) throw new Error(`Upload failed (${put.status})`);

    return { url: publicUrl, alt: "" };
  }

  /**
   * Upload logic sits in the change handler rather than an effect: it belongs
   * to the interaction, and an effect would re-run it on unrelated renders.
   */
  async function handleChange(event) {
    const picked = [...event.target.files];
    // The same file picked twice in a row fires no change event otherwise.
    event.target.value = "";
    if (picked.length === 0) return;

    /**
     * Take what fits and say what was left behind, rather than refusing the
     * whole selection — someone who drags in six photos wanting the first four
     * should not have to start again.
     */
    const room = MAX_PRODUCT_IMAGES - images.length;
    const files = picked.slice(0, room);
    const dropped = picked.length - files.length;

    setUploadError(
      dropped > 0
        ? `Only ${MAX_PRODUCT_IMAGES} photos per product — ${dropped} ${dropped === 1 ? "was" : "were"} skipped.`
        : ""
    );

    if (files.length === 0) return;
    setUploading((count) => count + files.length);

    // Independent uploads — one wait, not one per file.
    const results = await Promise.allSettled(files.map(uploadOne));

    const uploaded = [];
    const failures = [];
    for (const result of results) {
      if (result.status === "fulfilled") uploaded.push(result.value);
      else failures.push(result.reason?.message ?? "Upload failed");
    }

    // Whatever landed is kept — one bad file should not discard three good ones.
    if (uploaded.length > 0) setImages((current) => [...current, ...uploaded]);
    // A failed upload is more useful to report than a skipped extra.
    if (failures.length > 0) setUploadError(failures[0]);

    setUploading((count) => Math.max(0, count - files.length));
  }

  function remove(url) {
    setImages((current) => current.filter((image) => image.url !== url));
  }

  /** Featured means first, so "make featured" is a move to the front. */
  function makeFeatured(url) {
    setImages((current) => {
      const picked = current.find((image) => image.url === url);
      if (!picked) return current;
      return [picked, ...current.filter((image) => image.url !== url)];
    });
  }

  const isBusy = uploading > 0;
  const isFull = images.length >= MAX_PRODUCT_IMAGES;

  return (
    <div className="flex flex-col gap-2">
      <p className="font-nunito text-xs font-semibold text-foreground">
        Photos
        <span className="text-danger" aria-hidden="true">
          {" "}
          *
        </span>
        <span className="ml-1.5 font-normal text-muted">
          {images.length} of {MAX_PRODUCT_IMAGES}
        </span>
      </p>

      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <div className="flex flex-wrap gap-3">
        {images.map((image, index) => (
          <figure
            key={image.url}
            className="group relative h-24 w-24 overflow-hidden rounded-lg border border-border bg-background"
          >
            {/* A plain <img> — the same call as the products table. These are
                thumbnails on an internal page, and next/image would need every
                R2 host allow-listed in next.config.mjs. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />

            {index === 0 ? (
              <figcaption className="absolute inset-x-0 bottom-0 bg-brand/85 py-0.5 text-center font-nunito text-[0.625rem] font-semibold uppercase tracking-wide text-white">
                Featured
              </figcaption>
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={() => makeFeatured(image.url)}
                aria-label="Make this the featured photo"
                className="absolute bottom-1 left-1 rounded-md bg-surface/90 p-1 text-muted opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:text-brand"
              >
                <Star className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              disabled={disabled}
              onClick={() => remove(image.url)}
              aria-label="Remove this photo"
              className="absolute right-1 top-1 rounded-md bg-surface/90 p-1 text-muted opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            </button>
          </figure>
        ))}

        {/* Gone once the product is full, rather than sitting there disabled
            for a reason nobody can see. */}
        {isFull ? null : (
          <button
            type="button"
            disabled={disabled || isBusy}
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-background text-muted transition hover:border-brand/50 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            )}
            <span className="font-nunito text-[0.625rem] font-semibold">
              {isBusy ? "Uploading" : "Add photo"}
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        hidden
        onChange={handleChange}
      />

      {/* An upload that just failed outranks "you have no photos" — it is the
          more recent and more specific thing to fix. */}
      <p aria-live="polite" className="font-nunito text-xs text-muted">
        {uploadError || error ? (
          <span className="text-danger">{uploadError || error}</span>
        ) : (
          `JPEG, PNG, WebP or AVIF · up to ${MAX_IMAGE_MB}MB each · ${MAX_PRODUCT_IMAGES} photos max. The first one is shown on cards.`
        )}
      </p>
    </div>
  );
}
