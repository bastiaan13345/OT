import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { basename } from "path";
import type { ReadableStream as NodeWebReadableStream } from "stream/web";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { resolvePublicPath } from "@/lib/audio/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/opus",
  aiff: "audio/aiff",
  aif: "audio/aiff",
};

function contentTypeFor(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

function sanitizeDownloadName(title: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "mp3";
  const base = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || "track";
  return `${base}.${ext}`;
}

/**
 * Secure local download. Enforces Track.allowDownload, resolves the active
 * audio version (or the track's current audioUrl), guards against path
 * traversal, streams the file, and increments Track.downloads exactly once
 * per successful request.
 *
 * GET /api/tracks/[id]/download
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const track = await prisma.track.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      published: true,
      allowDownload: true,
      audioUrl: true,
      audioVersions: {
        where: { active: true },
        select: { url: true },
        take: 1,
      },
    },
  });

  if (!track || !track.published) {
    return NextResponse.json({ error: "Track not found." }, { status: 404 });
  }
  if (!track.allowDownload) {
    return NextResponse.json(
      { error: "Downloads are disabled for this track." },
      { status: 403 }
    );
  }

  const sourceUrl = track.audioVersions[0]?.url ?? track.audioUrl;
  const absPath = resolvePublicPath(sourceUrl);
  if (!absPath) {
    return NextResponse.json(
      { error: "Audio file could not be resolved." },
      { status: 404 }
    );
  }

  let size: number;
  try {
    const info = await stat(absPath);
    if (!info.isFile()) throw new Error("not a file");
    size = info.size;
  } catch {
    return NextResponse.json(
      { error: "Audio file is missing on disk." },
      { status: 404 }
    );
  }

  const fileName = basename(absPath);
  const downloadName = sanitizeDownloadName(track.title, fileName);

  // Increment only after we've confirmed the file is streamable.
  await prisma.track.update({
    where: { id: track.id },
    data: { downloads: { increment: 1 } },
  });

  const nodeStream = createReadStream(absPath);
  const webStream = Readable.toWeb(nodeStream) as unknown as NodeWebReadableStream;

  return new NextResponse(webStream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(fileName),
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
