/**
 * Shrinks an uploaded image to a small JPEG data URL.
 *
 * The prototype keeps products in localStorage (about 5MB), so a full-size
 * photo per product would fill it after a handful. A 480px thumbnail is a few
 * tens of KB and still looks right at every size the admin shows.
 */
export async function fileToThumbnail(file, maxSize = 480, quality = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`Could not read ${file.name}`));
      element.src = url;
    });

    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function isImageFile(file) {
  return file.type.startsWith("image/");
}
