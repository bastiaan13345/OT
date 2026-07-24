import { join } from "path";
import { stat } from "fs/promises";
import { ffprobe, ffmpegTranscode } from "./ffmpeg";
import { ensureUploadDir, publicUrl, uniqueFileName } from "./storage";

/**
 * Deterministic, local audio enhancement. Each preset is a fixed ffmpeg filter
 * chain — no generative AI, no external services. Output is always a fresh,
 * immutable MP3 (320 kbps) written to private local storage; the source file is never
 * modified. This is intentionally provider-agnostic: an external processor
 * could later be slotted in behind the same interface.
 */

export type EnhancePreset = "balanced" | "warm" | "bright";

export const ENHANCE_PRESETS: Record<
  EnhancePreset,
  { label: string; description: string; filters: string[] }
> = {
  balanced: {
    label: "Balanced",
    description:
      "Loudness-normalized to a streaming-safe target (-14 LUFS / -1 dBTP) with gentle full-band clarity.",
    filters: [
      "loudnorm=I=-14:TP=-1:LRA=11",
      "highpass=f=25",
      "acompressor=threshold=-18dB:ratio=2:attack=20:release=250",
    ],
  },
  warm: {
    label: "Warm",
    description:
      "Adds low-end body and tames harsh highs for a rounder, analog-leaning tone.",
    filters: [
      "loudnorm=I=-14:TP=-1:LRA=11",
      "bass=g=3:f=110:w=0.7",
      "treble=g=-2:f=9000:w=0.6",
      "acompressor=threshold=-18dB:ratio=2:attack=25:release=300",
    ],
  },
  bright: {
    label: "Bright",
    description:
      "Lifts presence and air for a crisp, forward sound while keeping levels safe.",
    filters: [
      "loudnorm=I=-14:TP=-1:LRA=11",
      "treble=g=3:f=8000:w=0.6",
      "highpass=f=35",
      "acompressor=threshold=-16dB:ratio=2:attack=15:release=200",
    ],
  },
};

export function isEnhancePreset(v: unknown): v is EnhancePreset {
  return v === "balanced" || v === "warm" || v === "bright";
}

export interface EnhanceResult {
  /** Private stored locator of the enhanced file, e.g. local:enhanced/enh-xxxx.mp3 */
  url: string;
  /** Absolute path on disk. */
  absPath: string;
  fileName: string;
  format: "mp3";
  bitrate: number; // kbps
  sizeBytes: number | null;
  duration: number | null;
  preset: EnhancePreset;
}

/**
 * Produce an enhanced rendition of `sourceAbsPath` using the given preset.
 * Returns metadata for a new immutable AudioVersion. Throws on ffmpeg failure.
 */
export async function enhanceAudioFile(
  sourceAbsPath: string,
  preset: EnhancePreset
): Promise<EnhanceResult> {
  const cfg = ENHANCE_PRESETS[preset];
  const dir = await ensureUploadDir("enhanced");
  const fileName = uniqueFileName(`enh-${preset}`, "mp3");
  const outAbs = join(dir, fileName);
  const bitrate = 320;

  const filterChain = cfg.filters.join(",");

  await ffmpegTranscode(
    sourceAbsPath,
    outAbs,
    filterChain,
    ["-c:a", "libmp3lame", "-b:a", `${bitrate}k`, "-map_metadata", "0"],
    300_000
  );

  // Probe the result for accurate duration; stat for size. Non-fatal on error.
  let duration: number | null = null;
  let sizeBytes: number | null = null;
  try {
    const probe = await ffprobe(outAbs);
    duration = probe.durationSec;
  } catch {
    // leave duration null
  }
  try {
    sizeBytes = (await stat(outAbs)).size;
  } catch {
    // leave size null
  }

  return {
    url: publicUrl("enhanced", fileName),
    absPath: outAbs,
    fileName,
    format: "mp3",
    bitrate,
    sizeBytes,
    duration,
    preset,
  };
}
