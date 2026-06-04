declare module 'gifenc' {
  export interface GIFEncoderOptions {
    /** Infinite loop = 0, no loop = -1 */
    repeat?: number
    initialCapacity?: number
  }
  export interface WriteFrameOptions {
    palette?: Uint8Array
    /** Delay in 1/100 sec units */
    delay?: number
    /** Disposal method */
    dispose?: number
    transparent?: boolean
    transparentIndex?: number
  }
  export interface GIFEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: WriteFrameOptions
    ): void
    finish(): void
    bytes(): Uint8Array
    bytesView(): Uint8Array
    download(filename?: string): void
    reset(): void
  }
  export function GIFEncoder(options?: GIFEncoderOptions): GIFEncoderInstance
  export function quantize(
    rgba: Uint8ClampedArray | Uint8Array,
    maxColors: number,
    options?: { format?: string; oneBitAlpha?: boolean | number }
  ): Uint8Array
  export function applyPalette(
    rgba: Uint8ClampedArray | Uint8Array,
    palette: Uint8Array,
    format?: string
  ): Uint8Array
  export function nearestColor(
    pixel: number[],
    palette: Uint8Array,
    format?: string
  ): number[]
  export function nearestColorIndex(
    pixel: number[],
    palette: Uint8Array,
    format?: string
  ): number
  export function prequantize(
    rgba: Uint8ClampedArray | Uint8Array,
    options?: { roundRGB?: number; oneBitAlpha?: boolean | number }
  ): void
  export function snapColorsToPalette(
    rgba: Uint8ClampedArray | Uint8Array,
    palette: Uint8Array,
    format?: string
  ): void
}
