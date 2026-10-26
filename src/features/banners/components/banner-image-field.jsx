"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  BANNER_RATIO_TOLERANCE,
  IMAGE_ACCEPT,
  MAX_BANNER_BYTES,
  MAX_BANNER_MB,
} from "@/constants/media";

/**
 * One banner slot — desktop or mobile — uploaded straight to Cloudflare R2.
 *
 * Same presigned-PUT route as the product uploader: the bytes never pass
 * through our server, because a server action would cap the body at 1MB and
 * raising that would still stream every file through the Next process.
 *
 * What this adds is **dimension capture**. The file's true pixel size is read
 * in the browser before the upload and submitted with it, for two reasons:
 *
 *   1. The storefront lays the MOBILE hero out from the stored width/height.
 *      Wrong numbers there mean the page jumps as the image loads.
 *   2. The DESKTOP hero is cropped to a fixed ratio by `object-cover`. Knowing
 *      the real shape is what lets this warn "the top and bottom will be cut"
 *      at upload time instead of leaving someone to notice on the live site.
 *
 * The value posts as one hidden JSON field, the same shape the action parses.
 */
export function BannerImageField({
  name,
  label,
  hint,
  defaultValue = null,
  target,
  cropped = false,
  error = "",
  altError = "",
  disabled = false,
}) {
  const [image, setImage] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef(null);

  const targetRatio = target.width / target.height;

  async function handleChange(event) {
    const file = event.target.files?.[0];
    // The same file picked twice in a row fires no change event otherwise.
    event.target.value = "";
    if (!file) return;

    setUploadError("");

    // Checked here as well as on the server: a presigned PUT cannot enforce a
    // size, so stopping it before the upload starts is the only way the person
    // finds out before waiting for it.
    if (file.size > MAX_BANNER_BYTES) {
      setUploadError(`That image is over ${MAX_BANNER_MB}MB.`);
      return;
    }

    setUploading(true);

    try {
      // Read the shape first: a file the browser cannot decode is not worth
      // uploading, and the dimensions have to travel with the URL.
      const size = await readImageSize(file);

      const signed = await fetch("/api/uploads/banner-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      });

      const payload = await signed.json().catch(() => ({}));
      if (!signed.ok) {
        throw new Error(payload.error ?? "Could not start the upload");
      }

      const { uploadUrl, publicUrl } = payload.data;

      // The Content-Type is part of the signature — send anything else and R2
      // rejects it. A failure here with no status is almost always the
      // bucket's CORS policy, not the credentials.
      const put = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!put.ok) throw new Error(`Upload failed (${put.status})`);

      // Alt text survives a re-upload: swapping the artwork for a better crop
      // of the same picture should not silently blank its description.
      setImage((current) => ({
        url: publicUrl,
        alt: current?.alt ?? "",
        width: size.width,
        height: size.height,
      }));
    } catch (uploadFailure) {
      setUploadError(uploadFailure.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function setAlt(alt) {
    setImage((current) => (current ? { ...current, alt } : current));
  }

  // Derived during render — no effect needed to keep it in step with `image`.
  const ratio = image?.width && image?.height ? image.width / image.height : null;
  const offBy = ratio ? Math.abs(ratio - targetRatio) / targetRatio : 0;
  const willCrop = cropped && ratio !== null && offBy > BANNER_RATIO_TOLERANCE;

  // How much of the height `object-cover` will trim. Only meaningful when the
  // upload is relatively taller than the box; a wider one loses width instead.
  const cropPercent =
    willCrop && ratio < targetRatio
      ? Math.round((1 - ratio / targetRatio) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-2">
      <p className="font-nunito text-xs font-semibold text-foreground">
        {label}
        <span className="text-danger" aria-hidden="true">
          {" "}
          *
        </span>
      </p>

      <input type="hidden" name={name} value={JSON.stringify(image)} />

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
        {image?.url ? (
          <figure className="group relative overflow-hidden rounded-md border border-border bg-background">
            {/* A plain <img> — the same call as the products table. next/image
                would need every R2 host allow-listed in next.config.mjs. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt=""
              className="block max-h-56 w-full object-contain"
              loading="lazy"
            />

            <button
              type="button"
              disabled={disabled}
              onClick={() => setImage(null)}
              aria-label={`Remove the ${label.toLowerCase()}`}
              className="absolute right-2 top-2 rounded-md bg-surface/90 p-1.5 text-muted opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </figure>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2 font-nunito text-xs font-semibold text-muted transition hover:border-brand/50 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            )}
            {uploading ? "Uploading" : image?.url ? "Replace" : "Upload"}
          </button>

          {image?.width ? (
            <span className="font-nunito text-xs text-muted">
              {image.width} × {image.height} · {ratio.toFixed(2)}:1
            </span>
          ) : null}
        </div>

        {/* Alt text sits with its image rather than in a separate block, so
            the thing being described is on screen while it is written. */}
        {image?.url ? (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${name}-alt`}
              className="font-nunito text-xs font-semibold text-foreground"
            >
              Describe this image
            </label>
            <input
              id={`${name}-alt`}
              type="text"
              value={image.alt}
              disabled={disabled}
              onChange={(event) => setAlt(event.target.value)}
              placeholder="Diwali gifting collection — handwoven sarees"
              className="font-nunito h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
            />
            {altError ? (
              <p role="alert" className="font-nunito text-xs text-danger">
                {altError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        onChange={handleChange}
      />

      {/*
        One line, most urgent first: a failed upload beats a crop warning,
        and a crop warning beats the standing hint. A warning rather than a
        block — a deliberately off-ratio hero is a judgement call, and this
        screen's job is to make sure it is one.
      */}
      <p aria-live="polite" className="font-nunito text-xs text-muted">
        {uploadError || error ? (
          <span className="text-danger">{uploadError || error}</span>
        ) : willCrop ? (
          <span className="text-danger">
            This is {ratio.toFixed(2)}:1 but the hero is{" "}
            {targetRatio.toFixed(2)}:1
            {cropPercent > 0
              ? ` — about ${cropPercent}% of the height will be cropped.`
              : " — the sides will be cropped."}{" "}
            Best size: {target.width} × {target.height}.
          </span>
        ) : (
          hint
        )}
      </p>
    </div>
  );
}

/**
 * The file's true pixel dimensions.
 *
 * An object URL and an <img> rather than `createImageBitmap`, which does not
 * decode every format this picker accepts in every browser. Revoked in both
 * outcomes so a long editing session does not leak the blobs.
 */
function readImageSize(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const probe = new Image();

    probe.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: probe.naturalWidth, height: probe.naturalHeight });
    };

    probe.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("That file could not be read as an image."));
    };

    probe.src = objectUrl;
  });
}
