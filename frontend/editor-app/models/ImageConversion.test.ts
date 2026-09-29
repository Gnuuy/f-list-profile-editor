import { describe, expect, it } from 'vitest';

import {
  canHaveTransparency,
  convertedImageName,
  describeFileSize,
  encodeUnderLimit,
  fitWithinMaxSide,
  ImageConversionError,
  isSupportedImageFile,
  isTiffFile,
  shrinkStep,
} from './ImageConversion';
import type { ImageSize } from './ImageConversion';

describe('image conversion sizes', () => {
  it.each([
    [{ width: 12000, height: 9000 }, { width: 8000, height: 6000 }],
    [{ width: 9000, height: 12000 }, { width: 6000, height: 8000 }],
    [{ width: 20000, height: 20000 }, { width: 8000, height: 8000 }],
    // The desktop converter's results for the same sizes.
    [{ width: 16001, height: 500 }, { width: 8000, height: 249 }],
    [{ width: 16001, height: 3 }, { width: 8000, height: 1 }],
  ])('scales %o down to %o', (size, expected) => {
    expect(fitWithinMaxSide(size)).toEqual(expected);
  });

  it('keeps the size of an image that already fits', () => {
    expect(fitWithinMaxSide({ width: 640, height: 480 })).toEqual({ width: 640, height: 480 });
  });

  it.each([
    [{ width: 400, height: 300 }, { width: 8000, height: 6000 }],
    [{ width: 300, height: 400 }, { width: 6000, height: 8000 }],
    [{ width: 1000, height: 3 }, { width: 8000, height: 24 }],
    [{ width: 8000, height: 100 }, { width: 8000, height: 100 }],
    [{ width: 12000, height: 9000 }, { width: 8000, height: 6000 }],
  ])('enlarges %o to %o when asked, keeping its shape', (size, expected) => {
    expect(fitWithinMaxSide(size, { enlarge: true })).toEqual(expected);
  });

  it('shrinks by 10% at a time, rounding down', () => {
    expect(shrinkStep({ width: 8000, height: 6001 })).toEqual({ width: 7200, height: 5400 });
  });
});

describe('getting under the size limit', () => {
  // A stand-in encoder whose files are one byte per pixel.
  const encodeByArea = async (size: ImageSize) => ({ size: size.width * size.height });

  it('keeps the first size that fits', async () => {
    const tried: ImageSize[] = [];
    const result = await encodeUnderLimit({ width: 3000, height: 3000 }, async size => {
      tried.push(size);
      return encodeByArea(size);
    }, 4_000_000);

    expect(tried.map(size => size.width)).toEqual([3000, 2700, 2430, 2187, 1968]);
    expect(result.size).toEqual({ width: 1968, height: 1968 });
    expect(result.file.size).toBeLessThanOrEqual(4_000_000);
  });

  it('encodes only once when the image already fits', async () => {
    let calls = 0;
    await encodeUnderLimit({ width: 100, height: 100 }, async size => {
      calls += 1;
      return encodeByArea(size);
    });
    expect(calls).toBe(1);
  });

  it('gives up before the image becomes tiny', async () => {
    await expect(encodeUnderLimit({ width: 500, height: 500 }, async () => ({ size: Infinity })))
      .rejects.toBeInstanceOf(ImageConversionError);
  });
});

describe('image files', () => {
  it.each([
    ['photo.PNG', true],
    ['scan.tif', true],
    ['art.webp', true],
    ['animation.gif', false],
    ['notes.txt', false],
    ['png', false],
  ])('%s is supported: %s', (name, supported) => {
    expect(isSupportedImageFile(name)).toBe(supported);
  });

  it('spots TIFF files, which browsers need help reading', () => {
    expect(isTiffFile('scan.TIFF')).toBe(true);
    expect(isTiffFile('photo.png')).toBe(false);
  });

  it('knows JPEGs are never transparent', () => {
    expect(canHaveTransparency('photo.JPEG')).toBe(false);
    expect(canHaveTransparency('art.png')).toBe(true);
    expect(canHaveTransparency('scan.tif')).toBe(true);
  });

  it('names the result after the original', () => {
    expect(convertedImageName('holiday.final.JPG')).toBe('holiday.final.png');
    expect(convertedImageName('art')).toBe('art.png');
  });

  it('describes sizes in the decimal megabytes F-list uses', () => {
    expect(describeFileSize(7_999_999)).toBe('8.0 MB');
    expect(describeFileSize(12_400_000)).toBe('12.4 MB');
    expect(describeFileSize(45_300)).toBe('45 KB');
  });
});
