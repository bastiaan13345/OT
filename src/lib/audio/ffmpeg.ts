import { spawn } from "child_process";

/**
 * Thin, dependency-free wrappers around the locally installed `ffprobe` and
 * `ffmpeg` binaries. These are the only place in the codebase that shell out to
 * ffmpeg; every audio feature (probing, analysis, enhancement) builds on top of
 * these helpers.
 *
 * Binaries are resolved from PATH by default but can be overridden with the
 * FFMPEG_PATH / FFPROBE_PATH environment variables.
 */

export const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";
export const FFPROBE_BIN = process.env.FFPROBE_PATH || "ffprobe";

export class FfmpegError extends Error {
  constructor(
    message: string,
    readonly code: number | null,
    readonly stderr: string
  ) {
    super(message);
    this.name = "FfmpegError";
  }
}

export interface RunResult {
  stdout: string;
  stderr: string;
}

interface RunOptions {
  /** Hard timeout in milliseconds; the process is killed if exceeded. */
  timeoutMs?: number;
  /** Bytes of stdout+stderr to retain (guards against runaway output). */
  maxBuffer?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_BUFFER = 8 * 1024 * 1024;

/**
 * Run a binary with an argument array (never a shell string — avoids injection).
 * Rejects with FfmpegError on non-zero exit, timeout, or spawn failure.
 */
export function run(
  bin: string,
  args: string[],
  opts: RunOptions = {}
): Promise<RunResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBuffer = opts.maxBuffer ?? DEFAULT_MAX_BUFFER;

  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(bin, args, { windowsHide: true });
    } catch (err) {
      reject(
        new FfmpegError(
          `Failed to spawn ${bin}: ${(err as Error).message}`,
          null,
          ""
        )
      );
      return;
    }

    let stdout = "";
    let stderr = "";
    let stdoutLen = 0;
    let stderrLen = 0;
    let killedForTimeout = false;

    const timer = setTimeout(() => {
      killedForTimeout = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutLen += chunk.length;
      if (stdoutLen <= maxBuffer) stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrLen += chunk.length;
      if (stderrLen <= maxBuffer) stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new FfmpegError(`${bin} error: ${err.message}`, null, stderr));
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (killedForTimeout) {
        reject(
          new FfmpegError(
            `${bin} timed out after ${timeoutMs}ms`,
            code,
            stderr
          )
        );
        return;
      }
      if (code !== 0) {
        reject(
          new FfmpegError(`${bin} exited with code ${code}`, code, stderr)
        );
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

export interface ProbeStream {
  codec_name?: string;
  codec_type?: string;
  sample_rate?: string;
  channels?: number;
  bit_rate?: string;
  duration?: string;
}

export interface ProbeResult {
  durationSec: number | null;
  codec: string | null;
  sampleRate: number | null;
  channels: number | null;
  bitrate: number | null; // kbps
  formatName: string | null;
  raw: unknown;
}

/**
 * Probe an audio file for technical metadata using ffprobe's JSON output.
 * Returns null-filled fields rather than throwing on missing values.
 */
export async function ffprobe(filePath: string): Promise<ProbeResult> {
  const { stdout } = await run(
    FFPROBE_BIN,
    [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ],
    { timeoutMs: 30_000 }
  );

  let parsed: {
    streams?: ProbeStream[];
    format?: { duration?: string; bit_rate?: string; format_name?: string };
  };
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new FfmpegError("ffprobe returned invalid JSON", 0, stdout.slice(0, 500));
  }

  const audio =
    parsed.streams?.find((s) => s.codec_type === "audio") ?? parsed.streams?.[0];
  const format = parsed.format ?? {};

  const durationStr = audio?.duration ?? format.duration;
  const bitrateStr = audio?.bit_rate ?? format.bit_rate;

  return {
    durationSec: durationStr ? Number(durationStr) : null,
    codec: audio?.codec_name ?? null,
    sampleRate: audio?.sample_rate ? Number(audio.sample_rate) : null,
    channels: audio?.channels ?? null,
    bitrate: bitrateStr ? Math.round(Number(bitrateStr) / 1000) : null,
    formatName: format.format_name ?? null,
    raw: parsed,
  };
}

/** Convenience: probe just the duration in seconds (null if undeterminable). */
export async function probeDurationSec(filePath: string): Promise<number | null> {
  try {
    const { durationSec } = await ffprobe(filePath);
    return durationSec && Number.isFinite(durationSec) ? durationSec : null;
  } catch {
    return null;
  }
}

/**
 * Run an ffmpeg filter graph over an input and capture stderr (where ffmpeg
 * writes analysis filter output such as astats / volumedetect / loudnorm).
 * Uses `-f null -` so no output file is produced.
 */
export async function ffmpegMeasure(
  filePath: string,
  filterGraph: string,
  timeoutMs = 120_000
): Promise<string> {
  const { stderr } = await run(
    FFMPEG_BIN,
    ["-hide_banner", "-nostats", "-i", filePath, "-af", filterGraph, "-f", "null", "-"],
    { timeoutMs }
  );
  return stderr;
}

/**
 * Transcode/enhance an input into an output path applying a filter graph.
 * Overwrites the output (-y). Codec args are passed through verbatim.
 */
export async function ffmpegTranscode(
  inputPath: string,
  outputPath: string,
  filterGraph: string | null,
  codecArgs: string[],
  timeoutMs = 300_000
): Promise<void> {
  const args = ["-hide_banner", "-nostats", "-y", "-i", inputPath];
  if (filterGraph) args.push("-af", filterGraph);
  args.push(...codecArgs, outputPath);
  await run(FFMPEG_BIN, args, { timeoutMs });
}

/** Whether ffmpeg + ffprobe are invokable in this environment. */
export async function ffmpegAvailable(): Promise<boolean> {
  try {
    await run(FFPROBE_BIN, ["-version"], { timeoutMs: 5_000 });
    await run(FFMPEG_BIN, ["-version"], { timeoutMs: 5_000 });
    return true;
  } catch {
    return false;
  }
}
