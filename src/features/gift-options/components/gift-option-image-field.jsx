"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import {
  GIFT_OPTION_IMAGE,
  GIFT_OPTION_RATIO_TOLERANCE,
  IMAGE_ACCEPT,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
} from "@/constants/media";

const TARGET_RATIO = GIFT_OPTION_IMAGE.width / GIFT_OPTION_IMAGE.height;

/**
 * The packaging / card-design image, uploaded straight to the public R2
 * bucket — the same presigned-PUT flow as the banner uploader.
 *
 * The preview sits in the same 4:3 `object-cover` box the cart uses, so what
 * staff see here is what shoppers get. The true pixel size is read from the
 * preview's own load event — that covers a fresh upload and an image saved
 * before this screen existed with one code path — and drives the crop
 * warning. A warning, not a block: a deliberate crop is a judgement call.
 *
 * Only the URL is posted; the model stores nothing else.
 */
export function GiftOptionImageField({ defaultValue = "", error = "", disabled = false }) {
  const [url, setUrl] = useState(defaultValue);
  const [size, setSize] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef(null);

  async function handleChange(event) {
    const file = event.target.files?.[0];
    // The same file picked twice in a row fires no change event otherwise.
    event.target.value = "";
    if (!file) return;

    setUploadError("");

    // A presigned PUT cannot enforce a size, so this is the only place the
    // person hears about it before waiting for the upload.
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError(`That image is over ${MAX_IMAGE_MB}MB.`);
      return;
    }

    setUploading(true);

    try {
      const signed = await fetch("/api/uploads/gift-option-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      });

      const payload = await signed.json().catch(() => ({}));
      if (!signed.ok) {
        throw new Error(payload.error ?? "Could not start the upload");
      }

      const { uploadUrl, publicUrl } = payload.data;

      // The Content-Type is part of the signature. A failure with no status
      // is almost always the bucket's CORS policy, not the credentials.
      const put = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!put.ok) throw new Error(`Upload failed (${put.status})`);

      setSize(null);
      setUrl(publicUrl);
    } catch (uploadFailure) {
      setUploadError(uploadFailure.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // Derived during render — no effect needed to keep it in step with `size`.
  const ratio = size ? size.width / size.height : null;
  const willCrop =
    ratio !== null &&
    Math.abs(ratio - TARGET_RATIO) / TARGET_RATIO > GIFT_OPTION_RATIO_TOLERANCE;

  return (
    <div className="flex flex-col gap-2">
      <p className="font-nunito text-xs font-semibold text-foreground">
        Image
        <span className="text-danger" aria-hidden="true">
          {" "}
          *
        </span>
      </p>

      <input type="hidden" name="image" value={url} />

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
        {url ? (
          <div className="aspect-[4/3] w-full max-w-64 overflow-hidden rounded-md border border-border bg-background">
            {/* A plain <img>, like the banner field: next/image would need
                every storefront image host allow-listed here too. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              onLoad={(event) =>
                setSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              className="h-full w-full object-cover"
            />
          </div>
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
            {uploading ? "Uploading" : url ? "Replace" : "Upload"}
          </button>

          {size ? (
            <span className="font-nunito text-xs text-muted">
              {size.width} × {size.height} · {ratio.toFixed(2)}:1
            </span>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        onChange={handleChange}
      />

      {/* One line, most urgent first: a failed upload, then a crop, then
          the standing hint. */}
      <p aria-live="polite" className="font-nunito text-xs text-muted">
        {uploadError || error ? (
          <span className="text-danger">{uploadError || error}</span>
        ) : willCrop ? (
          <span className="text-danger">
            This is {ratio.toFixed(2)}:1 but the cart tile is 4:3 — the edges
            will be cropped. Best size: {GIFT_OPTION_IMAGE.width} ×{" "}
            {GIFT_OPTION_IMAGE.height}.
          </span>
        ) : (
          `Shown in a 4:3 tile on the cart. Best size ${GIFT_OPTION_IMAGE.width} × ${GIFT_OPTION_IMAGE.height}. JPG, PNG, WebP or AVIF, up to ${MAX_IMAGE_MB}MB.`
        )}
      </p>
    </div>
  );
}
