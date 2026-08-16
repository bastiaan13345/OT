import { readFile, stat } from "fs/promises";
import { extname } from "path";
import { NextResponse } from "next/server";
import { resolvePublicPath } from "@/lib/audio/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

type RouteContext = {
  params: Promise<{ fileName: string }>;
};

async function loadCover(fileName: string) {
  const encoded = encodeURIComponent(fileName);
  const path = resolvePublicPath(`/api/media/covers/${encoded}`);
  const contentType = CONTENT_TYPES[extname(fileName).toLowerCase()];
  if (!path || !contentType) return null;

  try {
    const info = await stat(path);
    if (!info.isFile()) return null;
    return { path, size: info.size, contentType };
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { fileName } = await params;
  const cover = await loadCover(fileName);
  if (!cover) return NextResponse.json({ error: "Cover not found." }, { status: 404 });

  const contents = await readFile(cover.path);
  return new Response(contents, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(cover.size),
      "Content-Type": cover.contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function HEAD(_request: Request, { params }: RouteContext) {
  const { fileName } = await params;
  const cover = await loadCover(fileName);
  if (!cover) return new Response(null, { status: 404 });

  return new Response(null, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(cover.size),
      "Content-Type": cover.contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
