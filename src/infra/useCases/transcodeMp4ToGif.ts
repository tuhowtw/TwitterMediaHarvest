/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**
 * Transcodes a Twitter animated_gif mp4 URL to a real GIF blob.
 *
 * Pipeline: fetch mp4 → demux (mp4box) → decode frames (WebCodecs VideoDecoder)
 *           → draw to OffscreenCanvas → encode GIF (gifenc)
 *
 * Requires WebCodecs (Chrome ≥94, Firefox ≥130). Throws if unavailable so
 * the caller can fall back to downloading the original mp4.
 */
import { GIFEncoder, applyPalette, quantize } from 'gifenc'
import { DataStream, createFile } from 'mp4box'
import type { ISOFile, Sample, Track } from 'mp4box'

// ─── Types ──────────────────────────────────────────────────────────────────

interface SampleInfo {
  data: Uint8Array
  duration: number // ticks
  timescale: number
  isKey: boolean
  cts: number // composition timestamp in ticks
}

interface DemuxResult {
  config: VideoDecoderConfig
  samples: SampleInfo[]
}

interface DecodedFrame {
  imageData: ImageData
  durationMs: number
}

// ─── Demux ───────────────────────────────────────────────────────────────────

const getTrackDescription = (
  mp4file: ISOFile,
  trackId: number
): Uint8Array | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trak = (mp4file as any).getTrackById(trackId)
    const entry = trak?.mdia?.minf?.stbl?.stsd?.entries?.[0]
    const box = entry?.avcC ?? entry?.hvcC ?? entry?.vpcC ?? entry?.av1C
    if (!box) return undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DS = DataStream as any
    const stream = new DS(undefined, 0, DS.BIG_ENDIAN)
    box.write(stream)
    // Skip the 8-byte box header (size uint32 + fourcc uint32)
    return new Uint8Array(stream.buffer, 8)
  } catch {
    return undefined
  }
}

const demuxMp4 = (buffer: ArrayBuffer): Promise<DemuxResult> =>
  new Promise((resolve, reject) => {
    const mp4file = createFile()
    const samples: SampleInfo[] = []
    let totalSamples = 0
    let config: VideoDecoderConfig | null = null
    let resolved = false

    mp4file.onReady = (info: { tracks: Track[] }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const videoTrack = info.tracks.find((t: any) => t.video)
      if (!videoTrack) {
        reject(new Error('No video track found in mp4'))
        return
      }

      totalSamples = videoTrack.nb_samples
      const description = getTrackDescription(mp4file, videoTrack.id)

      config = {
        codec: videoTrack.codec,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        codedWidth: (videoTrack as any).video?.width ?? videoTrack.track_width,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        codedHeight:
          (videoTrack as any).video?.height ?? videoTrack.track_height,
        ...(description
          ? { description: description as Uint8Array<ArrayBufferLike> }
          : {}),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mp4file as any).setExtractionTracks({
        id: videoTrack.id,
        nbSamples: totalSamples,
      })
      mp4file.start()
    }

    mp4file.onSamples = (_id: number, _user: unknown, newSamples: Sample[]) => {
      for (const s of newSamples) {
        samples.push({
          data: s.data as Uint8Array,
          duration: s.duration,
          timescale: s.timescale,
          isKey: s.is_sync,
          cts: s.cts,
        })
      }

      if (!resolved && config && samples.length >= totalSamples) {
        resolved = true
        resolve({ config, samples })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mp4file as any).onError = (e: unknown) => reject(e)

    const ab = buffer.slice(0) as ArrayBuffer & { fileStart: number }
    ab.fileStart = 0
    mp4file.appendBuffer(ab)
    mp4file.flush()
  })

// ─── Decode ──────────────────────────────────────────────────────────────────

const decodeFrames = async (
  config: VideoDecoderConfig,
  samples: SampleInfo[]
): Promise<DecodedFrame[]> => {
  const videoFrames: VideoFrame[] = []
  let decodeError: Error | null = null

  const decoder = new VideoDecoder({
    output: frame => videoFrames.push(frame),
    error: e => {
      decodeError = e instanceof Error ? e : new Error(String(e))
    },
  })

  decoder.configure(config)

  for (const s of samples) {
    const timestampUs = Math.round((s.cts / s.timescale) * 1_000_000)
    const durationUs = Math.round((s.duration / s.timescale) * 1_000_000)
    decoder.decode(
      new EncodedVideoChunk({
        type: s.isKey ? 'key' : 'delta',
        timestamp: timestampUs,
        duration: durationUs,
        data: s.data,
      })
    )
  }

  await decoder.flush()

  if (decodeError) throw decodeError

  // Draw each VideoFrame to OffscreenCanvas to extract RGBA ImageData
  const width = config.codedWidth ?? 0
  const height = config.codedHeight ?? 0
  const canvas = new OffscreenCanvas(width, height)

  const ctx = canvas.getContext('2d')!

  const decoded: DecodedFrame[] = []
  for (const frame of videoFrames) {
    ctx.drawImage(frame, 0, 0)
    const imageData = ctx.getImageData(0, 0, width, height)
    const durationMs = (frame.duration ?? 100_000) / 1000
    decoded.push({ imageData, durationMs })
    frame.close()
  }

  decoder.close()
  return decoded
}

// ─── Encode ──────────────────────────────────────────────────────────────────

const GIF_DELAY_UNIT_MS = 10 // GIF delay is in 1/100 sec units
const MIN_DELAY_UNITS = 2

const encodeGif = (frames: DecodedFrame[]): Uint8Array => {
  if (frames.length === 0) throw new Error('No frames to encode as GIF')

  const { width, height } = frames[0].imageData
  const encoder = GIFEncoder()

  for (const { imageData, durationMs } of frames) {
    const palette = quantize(imageData.data, 256)
    const index = applyPalette(imageData.data, palette)
    const delay = Math.max(
      MIN_DELAY_UNITS,
      Math.round(durationMs / GIF_DELAY_UNIT_MS)
    )
    encoder.writeFrame(index, width, height, { palette, delay, dispose: 2 })
  }

  encoder.finish()
  return encoder.bytes()
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Transcode a Twitter animated_gif mp4 URL to a real animated GIF.
 * Throws `Error('WebCodecs not available')` if the environment lacks WebCodecs,
 * allowing callers to gracefully fall back to the mp4 download.
 */
export const transcodeMp4ToGif = async (mp4Url: string): Promise<Blob> => {
  if (typeof VideoDecoder === 'undefined') {
    throw new Error('WebCodecs not available')
  }

  const response = await fetch(mp4Url, { credentials: 'omit' })
  if (!response.ok) {
    throw new Error(`Failed to fetch mp4: HTTP ${response.status}`)
  }
  const buffer = await response.arrayBuffer()

  const { config, samples } = await demuxMp4(buffer)
  const frames = await decodeFrames(config, samples)
  const gifBytes = encodeGif(frames)

  return new Blob([gifBytes.buffer as ArrayBuffer], { type: 'image/gif' })
}

export const isWebCodecsAvailable = (): boolean =>
  typeof VideoDecoder !== 'undefined'
