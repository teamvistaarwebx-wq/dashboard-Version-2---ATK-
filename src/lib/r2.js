import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ALLOWED_IMAGE_TYPES, ALLOWED_LOGO_TYPES } from "@/constants/media";

/**
 * Cloudflare R2, over the S3 API.
 *
 * The bucket's write side is always private: this endpoint only accepts signed
 * requests, and the access key lives here and never reaches a browser. What is
 * public is the READ side — objects are served from R2_PUBLIC_BASE_URL, because
 * a product photo is meant to be seen by every shopper. Signing reads instead
 * would defeat CDN caching and leave broken images in any storefront page
 * cached long enough for the signature to expire.
 *
 * Customer uploads (corporate card logos) are the exception and live in a
 * SECOND, private bucket: R2 makes a whole bucket public or private, never a
 * folder, and files from the open enquiry form have no business on the public
 * CDN. That bucket has its own key pair scoped to it alone, so a leak of one
 * key cannot reach the other bucket.
 */

/** Long enough to upload a photo on a bad connection, short enough that a
 *  leaked URL is worth nothing by the time it is found. */
const SIGNED_URL_TTL_SECONDS = 5 * 60;

/** Long enough to view or download a logo, short enough to be useless if shared. */
const SIGNED_READ_TTL_SECONDS = 10 * 60;

let cachedClient = null;
let cachedUploadsClient = null;

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/**
 * One client per process. Built lazily rather than at module scope so importing
 * this file cannot crash a page that never uploads anything.
 */
function getClient() {
  if (cachedClient) return cachedClient;

  cachedClient = buildClient({
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
  });

  return cachedClient;
}

/** The private customer-uploads bucket's client, on its own key pair. */
function getUploadsClient() {
  if (cachedUploadsClient) return cachedUploadsClient;

  cachedUploadsClient = buildClient({
    accessKeyId: env("R2_UPLOADS_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_UPLOADS_SECRET_ACCESS_KEY"),
  });

  return cachedUploadsClient;
}

function buildClient(credentials) {
  return new S3Client({
    // "auto", not a real region — R2 rejects anything else.
    region: "auto",
    endpoint:
      process.env.R2_ENDPOINT ||
      `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials,
    /**
     * aws-sdk v3 from 3.729 onwards sends `x-amz-checksum-crc32` by default.
     * R2 does not implement the flexible-checksum headers, and a presigned PUT
     * signed with one fails with a signature mismatch that reads like a
     * credentials problem. Both flags have to be WHEN_REQUIRED.
     */
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

/** Absolute, CDN-facing URL for a stored key. */
export function buildPublicUrl(key) {
  const base = env("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
  return `${base}/${key}`;
}

/**
 * A one-shot URL the browser can PUT a single product photo to.
 *
 * The key is built here and never accepted from the caller: a client-supplied
 * key would let anyone who can reach this endpoint sign a write over an
 * existing object. `ContentType` is part of the signature, so the upload can
 * only be the type that was allow-listed.
 *
 * Note R2 cannot enforce a maximum size on a presigned PUT — only a POST policy
 * can, and R2's support for those is partial. Size is checked in the browser
 * and again against the declared length here; on an authenticated admin-only
 * surface that is proportionate.
 */
export async function presignProductImageUpload({ contentType }) {
  return presignUpload({ contentType, folder: "products" });
}

/**
 * The same one-shot URL for a homepage banner.
 *
 * Its own folder rather than a flag on the product signer: the bucket stays
 * browsable, and the storefront's `remotePatterns` already allow-lists the
 * whole host precisely so a new prefix needs no config change.
 */
export async function presignBannerImageUpload({ contentType }) {
  return presignUpload({ contentType, folder: "banners" });
}

/**
 * The same one-shot URL for a packaging or card-design image.
 *
 * The PUBLIC bucket, like products and banners: these are our own images and
 * every shopper sees them on the cart. Customer logos are the ones that go
 * to the private bucket (presignLogoUpload).
 */
export async function presignGiftOptionImageUpload({ contentType }) {
  return presignUpload({ contentType, folder: "gift-options" });
}

/**
 * A one-shot URL the shopper's browser PUTs a corporate logo to, in the
 * private bucket.
 *
 * Returns no public URL because there is none: the dashboard reads logos
 * through `signLogoRead`. The key is minted here for the same reason as the
 * product signer's, and is checked against LOGO_KEY_PATTERN when it comes
 * back attached to an order or enquiry.
 *
 * A presigned PUT cannot cap size, and this one is reachable from the open
 * enquiry form — so whatever lands is re-checked by verifyCardLogo before
 * any order or enquiry will reference it.
 */
export async function presignLogoUpload({ contentType }) {
  const extension = ALLOWED_LOGO_TYPES[contentType];
  if (!extension) throw new Error(`Unsupported logo type: ${contentType}`);

  const key = datedKey("logos", extension);
  const uploadUrl = await signPut({
    key,
    contentType,
    client: getUploadsClient(),
    bucket: env("R2_UPLOADS_BUCKET"),
  });

  return { uploadUrl, key };
}

/** Size and type of an uploaded logo, or null when nothing is at that key. */
export async function headLogo(key) {
  try {
    const head = await getUploadsClient().send(
      new HeadObjectCommand({ Bucket: env("R2_UPLOADS_BUCKET"), Key: key })
    );

    return {
      size: Number(head.ContentLength ?? 0),
      contentType: String(head.ContentType ?? ""),
    };
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound") {
      return null;
    }
    throw error;
  }
}

/** The first `length` bytes of a logo — enough to check what it really is. */
export async function readLogoBytes(key, length) {
  const object = await getUploadsClient().send(
    new GetObjectCommand({
      Bucket: env("R2_UPLOADS_BUCKET"),
      Key: key,
      Range: `bytes=0-${Math.max(0, length - 1)}`,
    })
  );

  return object.Body.transformToByteArray();
}

/**
 * A short-lived read URL for the dashboard.
 *
 * `download` sets Content-Disposition: attachment, so the file saves rather
 * than opening on R2's origin — the safe default for an SVG a stranger made.
 */
export async function signLogoRead(key, { download = false, fileName = "" } = {}) {
  return getSignedUrl(
    getUploadsClient(),
    new GetObjectCommand({
      Bucket: env("R2_UPLOADS_BUCKET"),
      Key: key,
      ...(download
        ? { ResponseContentDisposition: attachment(fileName || key.split("/").pop()) }
        : {}),
    }),
    { expiresIn: SIGNED_READ_TTL_SECONDS }
  );
}

/** ASCII-only filename, so a customer's file name can't malform the header. */
function attachment(fileName) {
  const safe = String(fileName).replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "logo";
  return `attachment; filename="${safe}"`;
}

async function presignUpload({ contentType, folder }) {
  const extension = ALLOWED_IMAGE_TYPES[contentType];
  if (!extension) throw new Error(`Unsupported image type: ${contentType}`);

  const key = datedKey(folder, extension);
  const uploadUrl = await signPut({
    key,
    contentType,
    client: getClient(),
    bucket: env("R2_BUCKET"),
  });

  return { uploadUrl, publicUrl: buildPublicUrl(key), key };
}

function datedKey(folder, extension) {
  const now = new Date();
  const year = now.getUTCFullYear();
  // Dated prefixes keep the bucket browsable and make a "delete everything
  // from before X" sweep a prefix listing rather than a full scan.
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${folder}/${year}/${month}/${randomUUID()}.${extension}`;
}

function signPut({ key, contentType, client, bucket }) {
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }),
    {
      expiresIn: SIGNED_URL_TTL_SECONDS,
      /**
       * Without this the presigner signs `host` and nothing else, and
       * ContentType on the command becomes a suggestion the browser can
       * ignore — the URL would accept any bytes under any type. Naming it
       * here puts content-type in X-Amz-SignedHeaders, so a PUT that sends a
       * different one fails the signature check at R2.
       */
      signableHeaders: new Set(["content-type"]),
    }
  );
}
