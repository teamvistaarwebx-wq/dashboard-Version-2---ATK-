/**
 * The corporate logo to print on the card, with a download for the printer.
 *
 * Every URL goes through /api/card-logos, which checks the admin session and
 * redirects to a freshly signed R2 link — the bucket is private, so there is
 * no public URL to put here.
 *
 * Shown inside <img> only: an SVG made by a stranger cannot run anything
 * there. PDFs have no image preview, so they get a label and the download.
 * The preview sits on the card's beige so a logo too light to print shows up
 * here first, not on 200 printed cards.
 */
const CARD_BACKGROUND = "#cbbfae";

export function CardLogoPreview({ logo }) {
  if (!logo?.key) return null;

  const query = new URLSearchParams({ key: logo.key });
  const viewUrl = `/api/card-logos?${query}`;

  query.set("download", "1");
  query.set("name", logo.fileName || `logo.${logo.format}`);
  const downloadUrl = `/api/card-logos?${query}`;

  const details = [
    logo.format.toUpperCase(),
    logo.width && logo.height ? `${logo.width} × ${logo.height} px` : null,
    formatSize(logo.size),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-2 pt-2">
      <p className="text-xs text-muted">Logo to print (40 × 20 mm box)</p>

      <div
        className="flex aspect-[2/1] w-full max-w-60 items-center justify-center rounded-md border border-border p-3"
        style={{ backgroundColor: CARD_BACKGROUND }}
      >
        {logo.format === "pdf" ? (
          <span className="text-sm font-semibold text-foreground">
            PDF logo
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={viewUrl}
            alt={`Logo: ${logo.fileName}`}
            className="h-full w-full object-contain"
          />
        )}
      </div>

      <p className="break-all text-xs text-muted">
        {logo.fileName} — {details}
      </p>

      <a
        href={downloadUrl}
        className="w-fit text-sm font-semibold text-brand underline-offset-2 hover:underline"
      >
        Download original
      </a>
    </div>
  );
}

function formatSize(bytes) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
