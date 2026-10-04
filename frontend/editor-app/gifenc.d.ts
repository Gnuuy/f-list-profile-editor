// The parts of gifenc (github.com/mattdesl/gifenc) used here. It ships without types.
declare module 'gifenc' {
  export type GifPalette = number[][];

  export type GifFrameOptions = {
    palette?: GifPalette;
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
  };

  export type GifEncoder = {
    writeFrame(index: Uint8Array, width: number, height: number, options?: GifFrameOptions): void;
    finish(): void;
    bytesView(): Uint8Array<ArrayBuffer>;
  };

  export function GIFEncoder(): GifEncoder;
  export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number): GifPalette;
}
