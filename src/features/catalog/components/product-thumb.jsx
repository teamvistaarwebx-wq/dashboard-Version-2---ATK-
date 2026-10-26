/**
 * Square product thumbnail. The first image when there is one; otherwise a
 * woven-texture tile in the product's swatch colour, so a row without a photo
 * still reads as "that indigo tie" rather than a grey placeholder.
 */
const SIZES = { xs: "size-8", sm: "size-10", md: "size-12", lg: "size-16" };

export function ProductThumb({ product, size = "sm", className = "" }) {
  const image = product?.images?.[0];
  const box = `${SIZES[size] ?? SIZES.sm} shrink-0 overflow-hidden rounded-lg border border-border`;

  if (image?.url) {
    return (
      // Mock and user-dropped images are object URLs or remote URLs of
      // unknown size, which next/image cannot optimise.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image.url} alt="" className={`${box} bg-surface-muted object-cover ${className}`} />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${box} block ${className}`}
      style={{
        backgroundColor: product?.swatch ?? "var(--neutral-bg)",
        backgroundImage:
          "repeating-linear-gradient(0deg, rgb(255 255 255 / 0.10) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgb(0 0 0 / 0.10) 0 1px, transparent 1px 4px)",
      }}
    />
  );
}
