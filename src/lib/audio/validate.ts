import { extname } from "path";

/**
 * Upload validation helpers: safe extensions, safe filenames, and size limits.
 * These are pure functions so they can be unit-tested and reused by both the
 * upload server action and any future API upload route.
 */

export const AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".flac",
  ".m4a",
  ".aac",
  ".ogg",
  ".oga",
  ".opus",
] as const;

export const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
] as const;

// Keep this aligned with the Next.js server-action request limit.
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const AUDIO_MIME_PREFIXES = ["audio/", "application/ogg"];
const IMAGE_MIME_PREFIXES = ["image/"];

export function safeExtension(fileName: string): string {
  return extname(fileName || "").toLowerCase();
}

export function isAllowedAudioExt(ext: string): boolean {
  return (AUDIO_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

export function isAllowedImageExt(ext: string): boolean {
  return (IMAGE_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

/**
 * Sanitize a user-supplied filename to a short, safe slug (no path separators,
 * no traversal, no control chars). Returns just the base name without extension.
 */
export function sanitizeBaseName(fileName: string): string {
  const base = (fileName || "")
    .replace(/\\/g, "/")
    .split("/")
    .pop()!
    .replace(/\.[^.]*$/, ""); // strip extension
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  return cleaned || "track";
}

export interface FileValidationError {
  ok: false;
  message: string;
}
export interface FileValidationOk {
  ok: true;
  ext: string;
}
export type FileValidation = FileValidationOk | FileValidationError;

export function validateAudioFile(file: File): FileValidation {
  if (!file || file.size === 0) {
    return { ok: false, message: "Audio file is empty or missing." };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return {
      ok: false,
      message: `Audio file exceeds the ${Math.round(
        MAX_AUDIO_BYTES / (1024 * 1024)
      )} MB limit.`,
    };
  }
  const ext = safeExtension(file.name);
  if (!isAllowedAudioExt(ext)) {
    return {
      ok: false,
      message: `Unsupported audio type "${ext || "unknown"}". Allowed: ${AUDIO_EXTENSIONS.join(
        ", "
      )}.`,
    };
  }
  // MIME is advisory (browsers vary); accept when present and plausible.
  if (file.type && !AUDIO_MIME_PREFIXES.some((p) => file.type.startsWith(p))) {
    // Some browsers report application/octet-stream — allow when the ext passed.
    if (file.type !== "application/octet-stream") {
      return {
        ok: false,
        message: `Audio MIME type "${file.type}" does not look like audio.`,
      };
    }
  }
  return { ok: true, ext };
}

export function validateImageFile(file: File): FileValidation {
  if (!file || file.size === 0) {
    return { ok: false, message: "Image file is empty." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      message: `Cover image exceeds the ${Math.round(
        MAX_IMAGE_BYTES / (1024 * 1024)
      )} MB limit.`,
    };
  }
  const ext = safeExtension(file.name);
  if (!isAllowedImageExt(ext)) {
    return {
      ok: false,
      message: `Unsupported image type "${ext || "unknown"}". Allowed: ${IMAGE_EXTENSIONS.join(
        ", "
      )}.`,
    };
  }
  if (file.type && !IMAGE_MIME_PREFIXES.some((p) => file.type.startsWith(p))) {
    if (file.type !== "application/octet-stream") {
      return {
        ok: false,
        message: `Image MIME type "${file.type}" does not look like an image.`,
      };
    }
  }
  return { ok: true, ext };
}
