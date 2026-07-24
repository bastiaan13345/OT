import { ffprobe, ffmpegMeasure } from "./ffmpeg";

/**
 * Deterministic, fully-local audio signal analysis. Everything here is computed
 * from the installed ffmpeg/ffprobe binaries — no network, no external AI. The
 * result shape includes `provider: "local"` and leaves room for an optional
 * external provider to enrich the same fields later (see AudioAnalysis model).
 */

export type SuggestionSeverity = "info" | "warning" | "critical";

export interface Suggestion {
  id: string;
  severity: SuggestionSeverity;
  message: string;
  /** Human-readable remediation, e.g. which enhancement preset helps. */
  fix: string;
}

export interface AudioAnalysisResult {
  durationSec: number | null;
  codec: string | null;
  sampleRate: number | null;
  channels: number | null;
  bitrate: number | null; // kbps
  loudnessLufs: number | null; // integrated loudness
  loudnessRange: number | null; // LRA
  truePeakDb: number | null; // dBTP
  peakDb: number | null; // sample peak dBFS
  clippingPct: number | null; // % of samples at/near full scale
  silencePct: number | null; // % of duration below silence threshold
  suggestions: Suggestion[];
  provider: "local";
}

const SILENCE_THRESHOLD_DB = -50;
const STREAMING_TARGET_LUFS = -14;

function matchFloat(re: RegExp, text: string): number | null {
  const m = text.match(re);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : null;
}

/** Parse ffmpeg `volumedetect` stderr for mean/max volume and clip histogram. */
function parseVolumeDetect(stderr: string): {
  peakDb: number | null;
  clippingPct: number | null;
} {
  const maxVolume = matchFloat(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/, stderr);
  const nSamples = matchFloat(/n_samples:\s*(\d+)/, stderr);

  // histogram_0db counts samples exactly at full scale; near-0 buckets imply
  // clipping. Sum the 0..1 dB buckets as a clipping proxy.
  let clippedSamples = 0;
  const histRe = /histogram_(\d+)db:\s*(\d+)/g;
  let hm: RegExpExecArray | null;
  while ((hm = histRe.exec(stderr)) !== null) {
    const bucketDb = Number(hm[1]);
    const count = Number(hm[2]);
    if (bucketDb <= 1) clippedSamples += count;
  }

  const clippingPct =
    nSamples && nSamples > 0 ? (clippedSamples / nSamples) * 100 : null;

  return { peakDb: maxVolume, clippingPct };
}

/** Parse ffmpeg `loudnorm` (print_format=summary) stderr for LUFS/LRA/TP. */
function parseLoudnorm(stderr: string): {
  loudnessLufs: number | null;
  loudnessRange: number | null;
  truePeakDb: number | null;
} {
  return {
    loudnessLufs: matchFloat(/Input Integrated:\s*(-?\d+(?:\.\d+)?)\s*LUFS/, stderr),
    loudnessRange: matchFloat(/Input LRA:\s*(-?\d+(?:\.\d+)?)\s*LU/, stderr),
    truePeakDb: matchFloat(/Input True Peak:\s*(-?\d+(?:\.\d+)?)\s*dBTP/, stderr),
  };
}

/** Sum durations reported by ffmpeg `silencedetect`. */
function parseSilence(stderr: string): number {
  let total = 0;
  const re = /silence_duration:\s*(\d+(?:\.\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stderr)) !== null) {
    total += Number(m[1]);
  }
  return total;
}

function buildSuggestions(r: Omit<AudioAnalysisResult, "suggestions" | "provider">): Suggestion[] {
  const out: Suggestion[] = [];

  if (r.clippingPct !== null && r.clippingPct >= 0.05) {
    out.push({
      id: "clipping",
      severity: r.clippingPct >= 0.5 ? "critical" : "warning",
      message: `Detected clipping on ~${r.clippingPct.toFixed(2)}% of samples.`,
      fix: "Reduce input gain or apply the 'balanced' enhancement to add headroom before limiting.",
    });
  }

  if (r.peakDb !== null && r.peakDb > -0.3) {
    out.push({
      id: "no-headroom",
      severity: "warning",
      message: `Peak level is ${r.peakDb.toFixed(1)} dBFS, leaving almost no headroom.`,
      fix: "Enhance with a preset to normalize to a safe true-peak ceiling (-1 dBTP).",
    });
  }

  if (r.loudnessLufs !== null) {
    const delta = STREAMING_TARGET_LUFS - r.loudnessLufs;
    if (Math.abs(delta) >= 2) {
      out.push({
        id: "loudness-off-target",
        severity: "info",
        message: `Integrated loudness is ${r.loudnessLufs.toFixed(1)} LUFS (streaming target ~${STREAMING_TARGET_LUFS} LUFS).`,
        fix:
          delta > 0
            ? "Track is quieter than target — the 'balanced' preset will bring it up."
            : "Track is louder than target — the 'balanced' preset will normalize it down.",
      });
    }
  }

  if (r.silencePct !== null && r.silencePct >= 8) {
    out.push({
      id: "long-silence",
      severity: "info",
      message: `~${r.silencePct.toFixed(1)}% of the track is near-silent.`,
      fix: "Consider trimming leading/trailing silence for a tighter listen.",
    });
  }

  if (r.sampleRate !== null && r.sampleRate < 44100) {
    out.push({
      id: "low-sample-rate",
      severity: "warning",
      message: `Sample rate is ${r.sampleRate} Hz, below the 44.1 kHz CD/streaming standard.`,
      fix: "Re-export the source at 44.1 kHz or higher for best distribution quality.",
    });
  }

  if (r.bitrate !== null && r.bitrate > 0 && r.bitrate < 128) {
    out.push({
      id: "low-bitrate",
      severity: "warning",
      message: `Encoded bitrate is ~${r.bitrate} kbps, which may sound compressed.`,
      fix: "Upload a higher-bitrate source (256+ kbps) or a lossless master.",
    });
  }

  if (out.length === 0) {
    out.push({
      id: "healthy",
      severity: "info",
      message: "No significant issues detected. Levels and loudness look good.",
      fix: "No action needed. Optional enhancement presets can still tailor the tone.",
    });
  }

  return out;
}

/**
 * Analyze an audio file on disk. Runs ffprobe + three ffmpeg measurement passes
 * (volumedetect, loudnorm summary, silencedetect) and derives actionable
 * suggestions. Individual measurement passes degrade gracefully to null.
 */
export async function analyzeAudioFile(filePath: string): Promise<AudioAnalysisResult> {
  const probe = await ffprobe(filePath);

  let peakDb: number | null = null;
  let clippingPct: number | null = null;
  try {
    const volStderr = await ffmpegMeasure(filePath, "volumedetect");
    ({ peakDb, clippingPct } = parseVolumeDetect(volStderr));
  } catch {
    // volumedetect unavailable — leave nulls
  }

  let loudnessLufs: number | null = null;
  let loudnessRange: number | null = null;
  let truePeakDb: number | null = null;
  try {
    const lnStderr = await ffmpegMeasure(
      filePath,
      "loudnorm=I=-14:TP=-1:LRA=11:print_format=summary"
    );
    ({ loudnessLufs, loudnessRange, truePeakDb } = parseLoudnorm(lnStderr));
  } catch {
    // loudnorm unavailable — leave nulls
  }

  let silencePct: number | null = null;
  try {
    const silStderr = await ffmpegMeasure(
      filePath,
      `silencedetect=noise=${SILENCE_THRESHOLD_DB}dB:d=1`
    );
    const silentSec = parseSilence(silStderr);
    if (probe.durationSec && probe.durationSec > 0) {
      silencePct = Math.min(100, (silentSec / probe.durationSec) * 100);
    }
  } catch {
    // silencedetect unavailable — leave null
  }

  const base = {
    durationSec: probe.durationSec,
    codec: probe.codec,
    sampleRate: probe.sampleRate,
    channels: probe.channels,
    bitrate: probe.bitrate,
    loudnessLufs,
    loudnessRange,
    truePeakDb,
    peakDb,
    clippingPct,
    silencePct,
  };

  return {
    ...base,
    suggestions: buildSuggestions(base),
    provider: "local",
  };
}
