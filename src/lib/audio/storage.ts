import { existsSync } from "fs";
import { basename, join, resolve } from "path";
import { mkdir } from "fs/promises";

/** Absolute path to the public/ directory served statically by Next. */
export const PUBLIC_DIR = join(process.cwd(), "public");

/** Root for all mutable media. Production must mount this on persistent storage. */
export function mediaRoot(): string {
  return resolve(
    /* turbopackIgnore: true */ process.env.MEDIA_ROOT || join(process.cwd(), "storage")
  );
}

export const UPLOAD_SUBDIRS = {
  audio: "audio",
  covers: "covers",
  enhanced: "enhanced",
} as const;

export type UploadKind = keyof typeof UPLOAD_SUBDIRS;

/** Absolute directory for an upload kind, created if missing. */
export async function ensureUploadDir(kind: UploadKind): Promise<string> {
  const dir = join(/* turbopackIgnore: true */ mediaRoot(), UPLOAD_SUBDIRS[kind]);
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
 * Covers use a validated public route; audio/enhanced files use private locators.
 */
export function publicUrl(kind: UploadKind, fileName: string): string {
  if (kind === "covers") {
    return `/api/media/covers/${encodeURIComponent(assertSafeFileName(fileName))}`;
  }
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
    return resolveInside(
      join(
        /* turbopackIgnore: true */ mediaRoot(),
        UPLOAD_SUBDIRS[kind as "audio" | "enhanced"]
      ),
      fileName
    );
  }

  if (!url.startsWith("/")) return null;

  const coverMatch = /^\/api\/media\/covers\/([^/]+)$/.exec(url);
  if (coverMatch) {
    try {
      const fileName = decodeURIComponent(coverMatch[1]);
      if (basename(fileName) !== fileName) return null;
      return resolveInside(
        join(/* turbopackIgnore: true */ mediaRoot(), UPLOAD_SUBDIRS.covers),
        fileName
      );
    } catch {
      return null;
    }
  }

  if (url.startsWith("/uploads/audio/")) {
    const relativePath = url.replace(/^\/uploads\/audio\/+/, "");
    const privatePath = resolveInside(
      join(/* turbopackIgnore: true */ mediaRoot(), UPLOAD_SUBDIRS.audio),
      relativePath
    );
    if (privatePath && existsSync(/* turbopackIgnore: true */ privatePath)) return privatePath;
    return resolveInside(PUBLIC_DIR, url.replace(/^\/+/, ""));
  }

  if (url.startsWith("/uploads/enhanced/")) {
    const relativePath = url.replace(/^\/uploads\/enhanced\/+/, "");
    const privatePath = resolveInside(
      join(/* turbopackIgnore: true */ mediaRoot(), UPLOAD_SUBDIRS.enhanced),
      relativePath
    );
    if (privatePath && existsSync(/* turbopackIgnore: true */ privatePath)) return privatePath;
    return resolveInside(PUBLIC_DIR, url.replace(/^\/+/, ""));
  }

  if (url.startsWith("/uploads/covers/")) {
    const relativePath = url.replace(/^\/uploads\/covers\/+/, "");
    const persistentPath = resolveInside(
      join(/* turbopackIgnore: true */ mediaRoot(), UPLOAD_SUBDIRS.covers),
      relativePath
    );
    if (persistentPath && existsSync(/* turbopackIgnore: true */ persistentPath)) {
      return persistentPath;
    }
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
