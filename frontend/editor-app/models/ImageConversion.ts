// F-list's limits for uploaded images.
export const F_LIST_MAX_IMAGE_SIDE = 8000;
export const F_LIST_MAX_IMAGE_BYTES = 8_000_000;

// Shrinking stops before either side drops below this.
const MIN_IMAGE_SIDE = 100;
const SHRINK_FACTOR = 0.9;

export const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.tif'] as const;

export type ImageSize = { width: number; height: number };

export class ImageConversionError extends Error {}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}

export function isSupportedImageFile(name: string): boolean {
  return (SUPPORTED_IMAGE_EXTENSIONS as readonly string[]).includes(extensionOf(name));
}

/** Browsers can't read TIFF themselves. */
export function isTiffFile(name: string): boolean {
  return ['.tif', '.tiff'].includes(extensionOf(name));
}

/** JPEGs are never transparent, so they needn't be checked. */
export function canHaveTransparency(name: string): boolean {
  return !['.jpg', '.jpeg'].includes(extensionOf(name));
}

/** The name the converted PNG downloads as. */
export function convertedImageName(name: string): string {
  const dot = name.lastIndexOf('.');
  return `${dot > 0 ? name.slice(0, dot) : name}.png`;
}

/**
 * Scales an image down to fit F-list's size limit, keeping its shape. Smaller
 * images keep their size unless `enlarge` is set; then they grow until the
 * longer side reaches the limit. Rounds down with the same arithmetic as the
 * desktop converter, so both give the same size.
 */
export function fitWithinMaxSide(size: ImageSize, { enlarge = false }: { enlarge?: boolean } = {}): ImageSize {
  const maxSide = F_LIST_MAX_IMAGE_SIDE;
  const fit = Math.min(maxSide / size.width, maxSide / size.height);
  const scale = enlarge ? fit : Math.min(1, fit);
  return {
    width: Math.max(1, Math.floor(size.width * scale)),
    height: Math.max(1, Math.floor(size.height * scale)),
  };
}

export function shrinkStep(size: ImageSize): ImageSize {
  return {
    width: Math.max(1, Math.floor(size.width * SHRINK_FACTOR)),
    height: Math.max(1, Math.floor(size.height * SHRINK_FACTOR)),
  };
}

/**
 * Encodes at `start`, then keeps shrinking by 10% until the file fits under
 * F-list's byte limit, as the desktop converter does.
 */
export async function encodeUnderLimit<T extends { size: number }>(
  start: ImageSize,
  encode: (size: ImageSize) => Promise<T>,
  limit = F_LIST_MAX_IMAGE_BYTES,
): Promise<{ file: T; size: ImageSize }> {
  let size = start;
  let file = await encode(size);
  while (file.size > limit) {
    if (size.width < MIN_IMAGE_SIDE || size.height < MIN_IMAGE_SIDE) {
      throw new ImageConversionError(
        'This image can\'t get under 8 MB without becoming extremely small.',
      );
    }
    size = shrinkStep(size);
    file = await encode(size);
  }
  return { file, size };
}

/** "12.4 MB", in the decimal megabytes F-list's limit uses. */
export function describeFileSize(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
