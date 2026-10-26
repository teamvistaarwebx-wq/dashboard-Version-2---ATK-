/**
 * Upload limits, in one place.
 *
 * Four things enforce these — the file picker, the presign route, the R2
 * signer and the form parser — and they have to agree. This file holds no
 * imports on purpose: the picker is a client component, and reaching into
 * lib/r2.js for the same constants would drag the AWS SDK into the browser
 * bundle.
 */

/** What the picker accepts, and what the upload signature pins. */
export const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** For the file input's `accept` attribute. */
export const IMAGE_ACCEPT = Object.keys(ALLOWED_IMAGE_TYPES).join(",");

/**
 * A product page shows a featured image and up to three more in the gallery.
 * More than that is a slower page for a shopper who has already decided.
 */
export const MAX_PRODUCT_IMAGES = 4;

/**
 * 2MB. Plenty for a web-sized product photo, and small enough that four of
 * them do not make the page a burden on a phone connection.
 */
export const MAX_IMAGE_MB = 2;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

/**
 * Banners get their own, larger ceiling: one full-bleed hero at 3448px wide
 * does not compress like a 600px product thumbnail, and the existing artwork
 * is already over the product limit.
 */
export const MAX_BANNER_MB = 6;
export const MAX_BANNER_BYTES = MAX_BANNER_MB * 1024 * 1024;

/**
 * The shape the storefront's hero actually renders.
 *
 * These MUST match `--aspect-banner-desktop` and `--aspect-banner-mobile` in
 * the storefront's src/styles/globals.css. Two apps, no shared package, so
 * the numbers are duplicated with this note rather than imported — the same
 * arrangement as MAX_ORDER_HEADCOUNT.
 *
 * They differ in kind, not just in number:
 *
 *   - **Desktop is cropped.** The image sits in a fixed-ratio box under
 *     `object-cover`, so anything that is not 2.937:1 loses its top and
 *     bottom. This is the one worth warning about at upload time.
 *   - **Mobile is not.** It renders at its natural ratio and pushes the page
 *     down, so any shape works — but the stored width/height must be the
 *     file's true pixels or the page shifts as it loads.
 */
export const BANNER_DESKTOP = { width: 1724, height: 587 };
export const BANNER_MOBILE = { width: 736, height: 980 };

/**
 * How far a desktop upload may sit from 2.937:1 before the form says it will
 * be cropped. 2% is about 12px on a 587px-tall banner — under that, nobody
 * would see the difference and a warning would only be noise.
 */
export const BANNER_RATIO_TOLERANCE = 0.02;

/** Retina target, and the smallest width worth uploading for a 100vw hero. */
export const BANNER_DESKTOP_RETINA = {
  width: BANNER_DESKTOP.width * 2,
  height: BANNER_DESKTOP.height * 2,
};

/**
 * Corporate logos printed on the 100 × 150 mm gift card.
 *
 * The logo sits in a 40 × 20 mm box under the message. 40 mm at 300 DPI is
 * about 472 px, so MIN_LOGO_PX gives a PNG twice that for headroom. SVG and
 * PDF are vector and have no pixel floor.
 *
 * Mirrored in the storefront's src/constants/card-logo.js — two apps, no
 * shared package, the same arrangement as MAX_ORDER_HEADCOUNT. Change both.
 */
export const ALLOWED_LOGO_TYPES = {
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "image/png": "png",
};

export const MAX_LOGO_MB = 5;
export const MAX_LOGO_BYTES = MAX_LOGO_MB * 1024 * 1024;

/** Shortest acceptable LONGEST side of a PNG, in pixels. */
export const MIN_LOGO_PX = 1000;

/** Uploads per client IP per window — the enquiry path has no OTP to lean on. */
export const LOGO_UPLOADS_PER_WINDOW = 10;
export const LOGO_UPLOAD_WINDOW_MS = 60 * 60 * 1000;

/**
 * The only key shape a logo can have. Keys are minted by the admin and come
 * back from the browser, so this is checked before any key touches R2.
 */
export const LOGO_KEY_PATTERN =
  /^logos\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(svg|pdf|png)$/;

/**
 * Packaging and card-design tiles on the storefront cart.
 *
 * The cart shows each option in a 4:3 box under `object-cover`, so anything
 * else loses its edges. Product-photo limits apply (MAX_IMAGE_BYTES): these
 * are small tiles, not heroes.
 */
export const GIFT_OPTION_IMAGE = { width: 1200, height: 900 };

/** Same tolerance as the banner — under 2% nobody sees the crop. */
export const GIFT_OPTION_RATIO_TOLERANCE = 0.02;
