import {
  ALLOWED_LOGO_TYPES,
  LOGO_KEY_PATTERN,
  MAX_LOGO_BYTES,
  MAX_LOGO_MB,
  MIN_LOGO_PX,
} from "@/constants/media";
import { headLogo, readLogoBytes } from "@/lib/r2";

/**
 * Checks a corporate card logo before an order or enquiry may point at it.
 *
 * The logo is optional, so nothing sent means `{ logo: null }`. Anything that
 * IS sent must pass every rule, because the browser's own checks are only UX:
 *
 *   1. the key is one this app minted (LOGO_KEY_PATTERN), so a caller cannot
 *      attach some other object in the bucket;
 *   2. the upload actually finished, and is no bigger than MAX_LOGO_BYTES —
 *      a presigned PUT cannot cap size, so this is where size is enforced;
 *   3. the stored type matches the key's extension;
 *   4. the bytes are what the type claims: a real PNG of at least
 *      MIN_LOGO_PX on its longest side, a real PDF, or an SVG with nothing
 *      executable in it.
 *
 * Returns `{ logo }` or `{ error }`; the error is shown to the shopper.
 */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The header may follow a little junk; the spec allows it in the first 1KB. */
const PDF_HEADER_WINDOW = 1024;

/**
 * Anything in an SVG that can run code or pull in something else. The
 * dashboard only ever shows a logo inside <img>, where none of this runs —
 * this is for whoever opens the file later in a browser or a design tool.
 */
const UNSAFE_SVG = [
  /<script/i,
  /<foreignObject/i,
  /<!ENTITY/i,
  /javascript:/i,
  /\son[a-z]+\s*=/i,
];

const MAX_FILE_NAME = 120;

const REUPLOAD = "Please remove the logo and upload it again.";

export async function verifyCardLogo(raw) {
  if (!raw || typeof raw !== "object" || !raw.key) return { logo: null };

  const key = String(raw.key);
  const match = LOGO_KEY_PATTERN.exec(key);
  if (!match) return { error: `We couldn't find your logo. ${REUPLOAD}` };

  const format = match[1];
  const expectedType = Object.keys(ALLOWED_LOGO_TYPES).find(
    (type) => ALLOWED_LOGO_TYPES[type] === format
  );

  const head = await headLogo(key);
  if (!head) {
    return { error: `Your logo upload didn't finish. ${REUPLOAD}` };
  }
  if (head.size <= 0) return { error: `Your logo file is empty. ${REUPLOAD}` };
  if (head.size > MAX_LOGO_BYTES) {
    return { error: `Your logo is larger than ${MAX_LOGO_MB}MB. ${REUPLOAD}` };
  }
  if (head.contentType !== expectedType) {
    return { error: `Your logo isn't a valid ${format.toUpperCase()} file. ${REUPLOAD}` };
  }

  const checked = await checkContents(key, format, head.size);
  if (checked.error) return checked;

  return {
    logo: {
      key,
      format,
      fileName: cleanFileName(raw.fileName, format),
      size: head.size,
      width: checked.width ?? null,
      height: checked.height ?? null,
    },
  };
}

async function checkContents(key, format, size) {
  if (format === "png") {
    const bytes = await readLogoBytes(key, 24);
    const isPng = PNG_SIGNATURE.every((byte, i) => bytes[i] === byte);
    if (!isPng || bytes.length < 24) {
      return { error: `Your logo isn't a valid PNG file. ${REUPLOAD}` };
    }

    // IHDR is always the first chunk: width and height are big-endian
    // 32-bit integers at bytes 16 and 20.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16);
    const height = view.getUint32(20);

    if (Math.max(width, height) < MIN_LOGO_PX) {
      return {
        error: `Your PNG logo is ${width} × ${height} px — it needs to be at least ${MIN_LOGO_PX} px on its longest side to print sharply. Upload a larger PNG, or an SVG or PDF.`,
      };
    }

    return { width, height };
  }

  if (format === "pdf") {
    const bytes = await readLogoBytes(key, Math.min(size, PDF_HEADER_WINDOW));
    const head = new TextDecoder("latin1").decode(bytes);
    if (!head.includes("%PDF-")) {
      return { error: `Your logo isn't a valid PDF file. ${REUPLOAD}` };
    }
    return {};
  }

  // SVG is text and at most MAX_LOGO_BYTES, so it is read whole.
  const bytes = await readLogoBytes(key, size);
  const text = new TextDecoder("utf-8").decode(bytes);

  if (!/<svg[\s>]/i.test(text)) {
    return { error: `Your logo isn't a valid SVG file. ${REUPLOAD}` };
  }
  if (UNSAFE_SVG.some((pattern) => pattern.test(text))) {
    return {
      error:
        "Your SVG contains scripts or embedded content we can't print. Export it again as a plain SVG, or upload a PDF or PNG.",
    };
  }

  return {};
}

/** Display and download name only — never used as a key. */
function cleanFileName(value, format) {
  const base = String(value ?? "")
    .split(/[\\/]/)
    .pop()
    // Control characters and anything a header or a filesystem would choke on.
    .replace(/[\u0000-\u001f\u007f"<>|:*?]+/g, "")
    .trim()
    .slice(0, MAX_FILE_NAME);

  return base || `logo.${format}`;
}
