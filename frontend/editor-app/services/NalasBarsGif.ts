import { GIFEncoder, quantize } from 'gifenc';

import { GIF_FRAME_DELAY_MS, planLoop, posesAt } from '../models/NalasBars';
import type { Bar } from '../models/NalasBars';
import { BARS_COLOURS, BARS_HEIGHT, BARS_WIDTH, drawBars } from './NalasBarsDrawing';

// Frames spread over the loop that the colour palette is built from.
const PALETTE_SAMPLES = 12;

/**
 * Renders one loop of the bars as a GIF that repeats forever. Each bar
 * finishes a whole number of cycles, so the last frame leads straight back
 * into the first. Pixels that don't change from the frame before are left
 * out, which keeps the file small.
 */
export async function exportBarsGif(
  bars: readonly Bar[],
  background: string,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const plan = planLoop(bars.map(bar => bar.speed));
  const canvas = document.createElement('canvas');
  canvas.width = BARS_WIDTH;
  canvas.height = BARS_HEIGHT;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This browser couldn\'t draw the bars.');

  const renderFrame = (frame: number) => {
    drawBars(context, bars, posesAt(bars, plan, (frame * plan.seconds) / plan.frames), background);
    return context.getImageData(0, 0, BARS_WIDTH, BARS_HEIGHT).data;
  };

  // One palette for the whole GIF, from frames across the loop. The last
  // slot is kept for "unchanged since the last frame".
  const pixelsPerFrame = BARS_WIDTH * BARS_HEIGHT * 4;
  const samples = new Uint8ClampedArray(pixelsPerFrame * PALETTE_SAMPLES);
  for (let sample = 0; sample < PALETTE_SAMPLES; sample += 1) {
    samples.set(renderFrame(Math.floor((sample * plan.frames) / PALETTE_SAMPLES)), sample * pixelsPerFrame);
  }
  // The flat colours go in exactly, so they never shift between frames.
  const exact = [background, ...BARS_COLOURS].map(hexToRgb);
  const palette = [...exact, ...quantize(samples, 255 - exact.length)];
  const unchanged = palette.length;
  const toIndex = paletteMatcher(palette);

  const gif = GIFEncoder();
  let previous: Uint8Array | null = null;
  for (let frame = 0; frame < plan.frames; frame += 1) {
    const indexed = toIndex(renderFrame(frame));
    if (!previous) {
      gif.writeFrame(indexed, BARS_WIDTH, BARS_HEIGHT, {
        palette: [...palette, [0, 0, 0]],
        delay: GIF_FRAME_DELAY_MS,
        repeat: 0,
        dispose: 1,
      });
    } else {
      const changes = indexed.slice();
      for (let pixel = 0; pixel < changes.length; pixel += 1) {
        if (changes[pixel] === previous[pixel]) changes[pixel] = unchanged;
      }
      gif.writeFrame(changes, BARS_WIDTH, BARS_HEIGHT, {
        delay: GIF_FRAME_DELAY_MS,
        transparent: true,
        transparentIndex: unchanged,
        dispose: 1,
      });
    }
    previous = indexed;
    onProgress?.(frame + 1, plan.frames);
    // Let the page update between frames.
    if (frame % 5 === 4) await new Promise(resolve => setTimeout(resolve));
  }
  gif.finish();
  return new Blob([gif.bytesView()], { type: 'image/gif' });
}

function hexToRgb(hex: string): number[] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Maps pixels to their nearest palette colour. Matches are remembered per
 * exact colour across all frames, so a colour always gets the same index and
 * nothing flickers.
 */
function paletteMatcher(palette: readonly number[][]) {
  const matches = new Map<number, number>();
  const nearest = (red: number, green: number, blue: number) => {
    let best = 0;
    let bestDistance = Infinity;
    palette.forEach(([r, g, b], index) => {
      const distance = (r - red) ** 2 + (g - green) ** 2 + (b - blue) ** 2;
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
    return best;
  };
  return (rgba: Uint8ClampedArray) => {
    const indexed = new Uint8Array(rgba.length / 4);
    for (let pixel = 0; pixel < indexed.length; pixel += 1) {
      const offset = pixel * 4;
      const colour = (rgba[offset] << 16) | (rgba[offset + 1] << 8) | rgba[offset + 2];
      let index = matches.get(colour);
      if (index === undefined) {
        index = nearest(rgba[offset], rgba[offset + 1], rgba[offset + 2]);
        matches.set(colour, index);
      }
      indexed[pixel] = index;
    }
    return indexed;
  };
}
