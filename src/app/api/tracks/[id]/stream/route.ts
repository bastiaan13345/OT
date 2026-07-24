import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { basename } from "path";
import { Readable } from "stream";
import type { ReadableStream as NodeWebReadableStream } from "stream/web";
import { NextResponse } from "next/server";
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

function contentTypeFor(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

function parseRange(value: string | null, size: number) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return undefined;

  const rawStart = match[1];
  const rawEnd = match[2];
  if (!rawStart && !rawEnd) return undefined;

  let start: number;
  let end: number;
  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return undefined;
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd ? Number(rawEnd) : size - 1;
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return undefined;
  }

  return { start, end: Math.min(end, size - 1) };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const track = await prisma.track.findUnique({
    where: { id },
    select: {
      published: true,
      audioUrl: true,
      audioVersions: {
        where: { active: true },
        select: { url: true },
        take: 1,
      },
    },
  });

  if (!track?.published) {
    return NextResponse.json({ error: "Track not found." }, { status: 404 });
  }

  const sourceUrl = track.audioVersions[0]?.url ?? track.audioUrl;
  const absPath = resolvePublicPath(sourceUrl);
  if (!absPath) {
    return NextResponse.json({ error: "Audio file could not be resolved." }, { status: 404 });
  }

  let size: number;
  try {
    const info = await stat(absPath);
    if (!info.isFile()) throw new Error("not a file");
    size = info.size;
  } catch {
    return NextResponse.json({ error: "Audio file is missing on disk." }, { status: 404 });
  }

  const range = parseRange(request.headers.get("range"), size);
  if (range === undefined) {
    return new NextResponse(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }

  const stream = range
    ? createReadStream(absPath, { start: range.start, end: range.end })
    : createReadStream(absPath);
  const webStream = Readable.toWeb(stream) as unknown as NodeWebReadableStream;
  const length = range ? range.end - range.start + 1 : size;

  return new NextResponse(webStream as unknown as ReadableStream, {
    status: range ? 206 : 200,
    headers: {
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=0, must-revalidate",
      "Content-Length": String(length),
      "Content-Type": contentTypeFor(basename(absPath)),
      ...(range
        ? { "Content-Range": `bytes ${range.start}-${range.end}/${size}` }
        : {}),
    },
  });
}
