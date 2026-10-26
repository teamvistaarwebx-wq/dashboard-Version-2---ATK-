import { BANNER_DESKTOP, BANNER_MOBILE } from "@/constants/media";

/**
 * Turns the banner form into a document, or into messages keyed by field.
 *
 * Both images arrive as one hidden JSON field each, written by the uploader
 * after the file has landed in R2 — the form itself never carries bytes.
 *
 * v1 accepts only `none` and `url` link types. The model allows product,
 * category, subcategory and collection too, but the storefront's
 * `resolveBannerHref` returns null for all four ("deep links resolved when
 * storefront routes exist"), so offering them here would let someone set a
 * destination that silently does nothing.
 */
const LINK_TYPES = new Set(["none", "url"]);

const MAX_NAME = 120;
const MAX_ALT = 200;

export function parseBannerForm(formData) {
  const errors = {};

  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, MAX_NAME);
  if (name.length < 2) errors.name = "Give this banner a name you'll recognise.";

  const desktop = parseImage(formData.get("desktop"), BANNER_DESKTOP);
  const mobile = parseImage(formData.get("mobile"), BANNER_MOBILE);

  if (!desktop) errors.desktop = "Upload a desktop banner.";
  if (!mobile) errors.mobile = "Upload a mobile banner.";

  // Alt text is on the schema as `required`, so an empty one would fail deep
  // in Mongoose with a message nobody can act on. Caught here instead.
  if (desktop && !desktop.alt) {
    errors.desktopAlt = "Describe the desktop banner for screen readers.";
  }
  if (mobile && !mobile.alt) {
    errors.mobileAlt = "Describe the mobile banner for screen readers.";
  }

  const linkType = String(formData.get("linkType") ?? "none");
  if (!LINK_TYPES.has(linkType)) errors.linkType = "Pick a destination.";

  const linkUrl = String(formData.get("linkUrl") ?? "").trim();
  if (linkType === "url" && !isSafeUrl(linkUrl)) {
    errors.linkUrl = "Enter a full https:// address or a path starting with /.";
  }

  if (Object.keys(errors).length > 0) return { errors };

  return {
    values: {
      name,
      desktop,
      mobile,
      link: {
        type: linkType,
        // Cleared rather than carried: the model's pre-validate hook blanks it
        // for "none" anyway, and sending a stale value is how a link nobody
        // chose ends up live.
        url: linkType === "url" ? linkUrl : "",
        openInNewTab: formData.get("openInNewTab") === "on",
      },
      isActive: formData.get("isActive") === "on",
      // Held off until the overlay editor exists. The schema keeps the fields.
      hasOverlay: false,
    },
  };
}

/**
 * Rebuilds one image from the uploader's JSON rather than trusting its shape.
 *
 * `width` and `height` fall back to the storefront's own numbers when the
 * browser could not read them: mobile lays out from these, so a missing pair
 * would collapse the hero to zero height rather than merely look wrong.
 */
function parseImage(raw, fallback) {
  let parsed;
  try {
    parsed = JSON.parse(String(raw ?? "null"));
  } catch {
    return null;
  }

  const url = String(parsed?.url ?? "").trim();
  if (!url) return null;

  return {
    url,
    alt: String(parsed?.alt ?? "")
      .trim()
      .slice(0, MAX_ALT),
    width: toDimension(parsed?.width, fallback.width),
    height: toDimension(parsed?.height, fallback.height),
  };
}

function toDimension(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

/**
 * An absolute https URL or a path on our own site.
 *
 * `javascript:` and friends are the reason this is an allow-list rather than a
 * "does it look like a link" check — the value ends up in an href on the
 * storefront's home page.
 */
function isSafeUrl(value) {
  if (!value) return false;
  // Protocol-relative ("//evil.example") is a different origin, not a path.
  if (value.startsWith("//")) return false;
  if (value.startsWith("/")) return true;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
