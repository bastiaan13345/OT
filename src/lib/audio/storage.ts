import { existsSync } from "fs";
import { basename, join, resolve } from "path";
import { mkdir } from "fs/promises";

/** Absolute path to the public/ directory served statically by Next. */
export const PUBLIC_DIR = join(process.cwd(), "public");
/** Absolute path to private local audio storage, not served by Next static files. */
export const STORAGE_DIR = join(process.cwd(), "storage");

export const UPLOAD_SUBDIRS = {
  audio: "audio",
  covers: "uploads/covers",
  enhanced: "enhanced",
} as const;

export type UploadKind = keyof typeof UPLOAD_SUBDIRS;

/** Absolute directory for an upload kind, created if missing. */
export async function ensureUploadDir(kind: UploadKind): Promise<string> {
  const root = kind === "covers" ? PUBLIC_DIR : STORAGE_DIR;
  const dir = join(root, UPLOAD_SUBDIRS[kind]);
  await mkdir(dir, { recursive: true });
  return dir;
}

function assertSafeFileName(fileName: string): string {
  const safe = basename(fileName);
  if (!safe || safe !== fileName || safe === "." || safe === "..") {
    throw new Error("Invalid upload file name.");
  }
  return safe;
}

function privateLocator(kind: "audio" | "enhanced", fileName: string): string {
  return `local:${kind}/${assertSafeFileName(fileName)}`;
}

/**
 * Stored locator for a file within an upload kind.
 * Covers remain public URLs; audio/enhanced files are private local locators.
 */
export function publicUrl(kind: UploadKind, fileName: string): string {
  if (kind === "covers") return `/${UPLOAD_SUBDIRS[kind]}/${assertSafeFileName(fileName)}`;
  return privateLocator(kind, fileName);
}

function resolveInside(root: string, relativePath: string): string | null {
  const abs = resolve(root, relativePath);
  const normalizedRoot = resolve(root);
  const rootWithSlash = normalizedRoot.endsWith("/") ? normalizedRoot : `${normalizedRoot}/`;
  if (abs !== normalizedRoot && !abs.startsWith(rootWithSlash)) return null;
  return abs;
}

/**
 * Resolve a stored locator to an absolute path on disk.
 * Supports private local locators plus legacy public upload URLs for migration.
 */
export function resolvePublicPath(url: string): string | null {
  if (!url) return null;

  const localMatch = /^local:(audio|enhanced)\/([^/]+)$/.exec(url);
  if (localMatch) {
    const [, kind, fileName] = localMatch;
    return resolveInside(join(STORAGE_DIR, UPLOAD_SUBDIRS[kind as "audio" | "enhanced"]), fileName);
  }

  if (!url.startsWith("/")) return null;

  if (url.startsWith("/uploads/audio/")) {
    const relativePath = url.replace(/^\/uploads\/audio\/+/, "");
    const privatePath = resolveInside(join(STORAGE_DIR, UPLOAD_SUBDIRS.audio), relativePath);
    if (privatePath && existsSync(privatePath)) return privatePath;
    return resolveInside(PUBLIC_DIR, url.replace(/^\/+/, ""));
  }

  if (url.startsWith("/uploads/enhanced/")) {
    const relativePath = url.replace(/^\/uploads\/enhanced\/+/, "");
    const privatePath = resolveInside(join(STORAGE_DIR, UPLOAD_SUBDIRS.enhanced), relativePath);
    if (privatePath && existsSync(privatePath)) return privatePath;
    return resolveInside(PUBLIC_DIR, url.replace(/^\/+/, ""));
  }

  return resolveInside(PUBLIC_DIR, url.replace(/^\/+/, ""));
}

/** Generate a collision-resistant filename with a sanitized base + extension. */
export function uniqueFileName(base: string, ext: string): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const dotExt = ext.startsWith(".") ? ext : `.${ext}`;
  return `${base}-${stamp}${rand}${dotExt}`;
}
