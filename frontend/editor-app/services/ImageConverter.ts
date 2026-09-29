import {
  canHaveTransparency,
  convertedImageName,
  encodeUnderLimit,
  fitWithinMaxSide,
  ImageConversionError,
  isTiffFile,
} from '../models/ImageConversion';
import type { ImageSize } from '../models/ImageConversion';

export type ConvertedImage = {
  blob: Blob;
  name: string;
  original: ImageSize;
  size: ImageSize;
};

export type ConvertOptions = {
  /** Grow smaller images until the longer side reaches F-list's limit. */
  enlarge?: boolean;
  /** Told each size tried while shrinking to fit under 8 MB. */
  onAttempt?: (size: ImageSize) => void;
};

/**
 * Converts an image in the browser for F-list: at most 8000 × 8000 and under
 * 8 MB, saved as PNG with any transparency kept. Nothing is uploaded.
 */
export async function convertForFList(
  file: File,
  { enlarge = false, onAttempt }: ConvertOptions = {},
): Promise<ConvertedImage> {
  const source = await decodeImage(file);
  try {
    const original = { width: source.width, height: source.height };
    // Without transparency the PNG needs no alpha channel, which keeps it smaller.
    const opaque = !canHaveTransparency(file.name) || !hasTransparency(source);
    const start = fitWithinMaxSide(original, { enlarge });
    const { file: blob, size } = await encodeUnderLimit(start, async attempt => {
      onAttempt?.(attempt);
      return encodePng(source, attempt, opaque);
    });
    return { blob, name: convertedImageName(file.name), original, size };
  } finally {
    source.close();
  }
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return isTiffFile(file.name) ? await decodeTiff(file) : await createImageBitmap(file);
  } catch (error) {
    if (error instanceof ImageConversionError) throw error;
    throw new ImageConversionError('This file couldn\'t be read as an image.');
  }
}

async function decodeTiff(file: File): Promise<ImageBitmap> {
  // Only loaded for TIFFs, so other conversions don't pay for it. It's an
  // old-style module, which bundlers expose either directly or as `default`.
  const loaded = await import('utif2');
  const UTIF = loaded.default ?? loaded;
  const buffer = await file.arrayBuffer();
  // The first page, as the desktop converter reads it.
  const [page] = UTIF.decode(buffer);
  if (!page) throw new ImageConversionError('This TIFF has no image in it.');
  UTIF.decodeImage(buffer, page);
  const rgba = UTIF.toRGBA8(page);
  const pixels = new Uint8ClampedArray(rgba.buffer as ArrayBuffer, rgba.byteOffset, rgba.byteLength);
  return createImageBitmap(new ImageData(pixels, page.width, page.height));
}

function createCanvas(size: ImageSize, { opaque = false, willReadFrequently = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d', { alpha: !opaque, willReadFrequently });
  if (!context) throw new ImageConversionError('Your browser couldn\'t make room for this image.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  return { canvas, context };
}

function release(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

/** Whether any pixel is even slightly see-through, read in strips to spare memory. */
function hasTransparency(source: ImageBitmap): boolean {
  const stripHeight = Math.max(1, Math.min(source.height, Math.floor(4_000_000 / source.width)));
  const { canvas, context } = createCanvas(
    { width: source.width, height: stripHeight },
    { willReadFrequently: true },
  );
  try {
    for (let top = 0; top < source.height; top += stripHeight) {
      const rows = Math.min(stripHeight, source.height - top);
      context.clearRect(0, 0, source.width, rows);
      context.drawImage(source, 0, top, source.width, rows, 0, 0, source.width, rows);
      const { data } = context.getImageData(0, 0, source.width, rows);
      for (let alpha = 3; alpha < data.length; alpha += 4) {
        if (data[alpha] < 255) return true;
      }
    }
    return false;
  } finally {
    release(canvas);
  }
}

async function encodePng(source: ImageBitmap, size: ImageSize, opaque: boolean): Promise<Blob> {
  // Halve first, then make the last step. One big jump skips pixels and looks
  // jagged in browsers that only blend the nearest few.
  let current: CanvasImageSource = source;
  let currentSize: ImageSize = { width: source.width, height: source.height };
  let step: HTMLCanvasElement | null = null;
  while (currentSize.width >= size.width * 2 && currentSize.height >= size.height * 2) {
    const next = {
      width: Math.floor(currentSize.width / 2),
      height: Math.floor(currentSize.height / 2),
    };
    const { canvas, context } = createCanvas(next);
    context.drawImage(current, 0, 0, next.width, next.height);
    if (step) release(step);
    step = canvas;
    current = canvas;
    currentSize = next;
  }

  const { canvas, context } = createCanvas(size, { opaque });
  context.drawImage(current, 0, 0, size.width, size.height);
  if (step) release(step);

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  release(canvas);
  if (!blob) {
    throw new ImageConversionError('Your browser couldn\'t save this image. It may be too large for it.');
  }
  return blob;
}
