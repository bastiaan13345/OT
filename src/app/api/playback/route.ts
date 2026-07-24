import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Seconds of playback required before a play is counted toward Track.plays. */
const QUALIFY_SECONDS = 10;

const ALLOWED_SOURCES = new Set([
  "web",
  "home",
  "browse",
  "track-page",
  "playlist",
  "release",
  "feed",
  "history",
  "embed",
]);

type PlaybackBody = {
  playbackId?: unknown;
  trackId?: unknown;
  playedSeconds?: unknown;
  completed?: unknown;
  source?: unknown;
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function asFiniteNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * Idempotent playback tracking.
 *
 * Body: { playbackId, trackId, playedSeconds, completed?, source? }
 * - `playbackId` is a client-generated unique id for one logical listen.
 * - Repeated POSTs upsert progress (monotonic max of playedSeconds).
 * - A play is counted toward Track.plays EXACTLY ONCE, the first time the
 *   event reaches its real-listening threshold, guarded by countedAt.
 */
export async function POST(request: Request) {
  let body: PlaybackBody;
  try {
    body = (await request.json()) as PlaybackBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const playbackId = asString(body.playbackId);
  const trackId = asString(body.trackId);
  const playedSeconds = asFiniteNumber(body.playedSeconds) ?? 0;
  const completed = body.completed === true;
  const sourceRaw = asString(body.source);
  const source = sourceRaw && ALLOWED_SOURCES.has(sourceRaw) ? sourceRaw : "web";

  if (!playbackId || playbackId.length > 100) {
    return NextResponse.json(
      { error: "A valid playbackId is required." },
      { status: 400 }
    );
  }
  if (!trackId) {
    return NextResponse.json({ error: "trackId is required." }, { status: 400 });
  }
  if (playedSeconds < 0 || playedSeconds > 86_400) {
    return NextResponse.json(
      { error: "playedSeconds is out of range." },
      { status: 400 }
    );
  }

  // Track must exist and be published to accrue plays.
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { id: true, published: true, duration: true },
  });
  if (!track || !track.published) {
    return NextResponse.json({ error: "Track not found." }, { status: 404 });
  }

  // Optional listener attribution — anonymous plays are allowed.
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  // Upsert progress. playedSeconds is kept monotonic (never regresses) so late,
  // out-of-order beacons cannot lower a session's high-water mark.
  const existing = await prisma.playbackEvent.findUnique({
    where: { playbackId },
    select: { id: true, playedSeconds: true, countedAt: true, trackId: true },
  });

  if (existing && existing.trackId !== trackId) {
    return NextResponse.json(
      { error: "playbackId already bound to a different track." },
      { status: 409 }
    );
  }

  const nextPlayed = existing
    ? Math.max(existing.playedSeconds, playedSeconds)
    : playedSeconds;

  const event = existing
    ? await prisma.playbackEvent.update({
        where: { playbackId },
        data: { playedSeconds: nextPlayed, completed: completed || undefined },
        select: { id: true, countedAt: true },
      })
    : await prisma.playbackEvent.create({
        data: {
          playbackId,
          trackId,
          userId,
          source,
          playedSeconds: nextPlayed,
          completed,
        },
        select: { id: true, countedAt: true },
      });

  const qualificationSeconds = Math.min(
    QUALIFY_SECONDS,
    Math.max(1, track.duration ?? QUALIFY_SECONDS)
  );
  const qualifies = nextPlayed >= qualificationSeconds;

  let counted = event.countedAt != null;

  // Count exactly once. The updateMany with `countedAt: null` guard is atomic:
  // only the first qualifying request flips it, so concurrent beacons for the
  // same session can never double-increment Track.plays.
  if (qualifies && !counted) {
    counted = await prisma.$transaction(async (tx) => {
      const flipped = await tx.playbackEvent.updateMany({
        where: { id: event.id, countedAt: null },
        data: { countedAt: new Date() },
      });
      if (flipped.count !== 1) return true;

      await tx.track.update({
        where: { id: trackId },
        data: { plays: { increment: 1 } },
      });
      return true;
    });
  }

  return NextResponse.json({
    ok: true,
    playbackId,
    playedSeconds: nextPlayed,
    qualified: qualifies,
    counted,
  });
}
