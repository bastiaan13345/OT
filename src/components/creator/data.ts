import "server-only";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  AnalyticsSummary,
  AnalysisSuggestion,
  AudioAnalysis,
  AudioVersion,
  ProcessingJob,
  Release,
  StudioTrack,
  TrackAnalyticsRow,
} from "./types";

// ---------------------------------------------------------------------------
// Server-only data layer for creator surfaces. All queries are ownership
// scoped (admins see everything, creators see only their own rows) as defense
// in depth — page-level auth is not assumed sufficient. Maps raw Prisma rows
// into the UI shapes declared in types.ts.
// ---------------------------------------------------------------------------

type SessionShape = { user: { id: string; role?: string } };

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  if (session.user.role !== "CREATOR" && session.user.role !== "ADMIN") {
    redirect("/library");
  }
  return session;
}

function isAdmin(session: SessionShape) {
  return session.user.role === "ADMIN";
}

/** Ownership scope for track queries. */
function ownerWhere(session: SessionShape) {
  return isAdmin(session) ? {} : { creatorId: session.user.id };
}

function isOwner(session: SessionShape, creatorId: string | null | undefined) {
  return isAdmin(session) || creatorId === session.user.id;
}

// --- normalizers ------------------------------------------------------------

function toVersion(v: {
  id: string;
  trackId: string;
  kind: string;
  preset: string | null;
  label: string | null;
  format: string | null;
  bitrate: number | null;
  duration: number | null;
  active: boolean;
  createdAt: Date;
}): AudioVersion {
  return {
    id: v.id,
    trackId: v.trackId,
    kind: v.kind === "enhanced" ? "enhanced" : "original",
    preset: v.preset,
    label: v.label,
    format: v.format,
    bitrate: v.bitrate,
    duration: v.duration,
    active: v.active,
    createdAt: v.createdAt,
  };
}

function parseSuggestions(raw: string | null): AnalysisSuggestion[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s, i) => ({
      id: String(s?.id ?? i),
      severity: String(s?.severity ?? "info"),
      message: String(s?.message ?? s ?? ""),
      fix: s?.fix != null ? String(s.fix) : null,
    }));
  } catch {
    return [];
  }
}

function toAnalysis(a: {
  id: string;
  trackId: string;
  audioVersionId: string | null;
  durationSec: number | null;
  codec: string | null;
  sampleRate: number | null;
  channels: number | null;
  bitrate: number | null;
  loudnessLufs: number | null;
  loudnessRange: number | null;
  truePeakDb: number | null;
  peakDb: number | null;
  clippingPct: number | null;
  silencePct: number | null;
  suggestions: string | null;
  provider: string;
  createdAt: Date;
}): AudioAnalysis {
  return {
    id: a.id,
    trackId: a.trackId,
    audioVersionId: a.audioVersionId,
    durationSec: a.durationSec,
    codec: a.codec,
    sampleRate: a.sampleRate,
    channels: a.channels,
    bitrate: a.bitrate,
    loudnessLufs: a.loudnessLufs,
    loudnessRange: a.loudnessRange,
    truePeakDb: a.truePeakDb,
    peakDb: a.peakDb,
    clippingPct: a.clippingPct,
    silencePct: a.silencePct,
    suggestions: parseSuggestions(a.suggestions),
    provider: a.provider,
    createdAt: a.createdAt,
  };
}

function toJob(j: {
  id: string;
  trackId: string;
  type: string;
  status: string;
  preset: string | null;
  progress: number;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProcessingJob {
  const status = (
    ["pending", "running", "completed", "failed"].includes(j.status)
      ? j.status
      : "pending"
  ) as ProcessingJob["status"];
  return {
    id: j.id,
    trackId: j.trackId,
    type: j.type,
    status,
    preset: j.preset,
    progress: j.progress,
    error: j.error,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  };
}

// --- studio -----------------------------------------------------------------

/** Tracks the current user owns, most recent first. */
export async function getOwnedTracks() {
  const session = await requireSession();
  return prisma.track.findMany({
    where: ownerWhere(session),
    orderBy: { createdAt: "desc" },
  });
}

/** Full studio payload for one track. Returns null if not found / not owned. */
export async function getStudioTrack(
  trackId: string
): Promise<StudioTrack | null> {
  const session = await requireSession();
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      audioVersions: { orderBy: { createdAt: "asc" } },
      audioAnalyses: { orderBy: { createdAt: "desc" }, take: 1 },
      processingJobs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!track) return null;
  if (!isOwner(session, track.creatorId)) return null; // defense in depth

  const { audioVersions, audioAnalyses, processingJobs, ...base } = track;
  return {
    track: base,
    versions: audioVersions.map(toVersion),
    analysis: audioAnalyses[0] ? toAnalysis(audioAnalyses[0]) : null,
    jobs: processingJobs.map(toJob),
  };
}

// --- analytics --------------------------------------------------------------

/**
 * Aggregate playback analytics for the owner's catalog from PlaybackEvent
 * rows plus stored Track/like/comment counts. Every number is derived from
 * real rows; with no events, listening metrics are honest zeros (no fake data).
 */
export async function getAnalytics(): Promise<AnalyticsSummary> {
  const session = await requireSession();

  const tracks = await prisma.track.findMany({
    where: ownerWhere(session),
    include: { likes: true, comments: true },
    orderBy: { createdAt: "desc" },
  });

  const trackIds = tracks.map((t) => t.id);
  const totalDownloads = tracks.reduce((a, t) => a + t.downloads, 0);
  const totalLikes = tracks.reduce((a, t) => a + t.likes.length, 0);
  const totalComments = tracks.reduce((a, t) => a + t.comments.length, 0);

  const events = trackIds.length
    ? await prisma.playbackEvent.findMany({
        where: { trackId: { in: trackIds } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const hasEvents = events.length > 0;
  // The playback endpoint is the source of truth for qualification. Using
  // countedAt keeps analytics aligned with the idempotent Track.plays update.
  const isQualified = (e: (typeof events)[number]) => e.countedAt != null;

  const uniqueListeners = new Set(
    events.map((e) => e.userId ?? `anon:${e.playbackId}`)
  ).size;

  // Track.plays is incremented atomically when an event first qualifies and
  // can also contain imported/legacy history. Add only unqualified starts to
  // avoid double-counting qualified events or dropping historical totals.
  const qualifiedPlays = tracks.reduce((a, t) => a + t.plays, 0);
  const unqualifiedEvents = events.filter((event) => !isQualified(event));
  const totalPlays = qualifiedPlays + unqualifiedEvents.length;
  const listenedSecondsTotal = events.reduce((a, e) => a + e.playedSeconds, 0);
  const completedPlays = events.filter((e) => e.completed).length;
  const avgListenedSeconds = hasEvents
    ? Math.round(listenedSecondsTotal / events.length)
    : 0;
  const completionRate = hasEvents
    ? Math.round((completedPlays / events.length) * 100)
    : 0;

  const unqualifiedByTrack = new Map<string, number>();
  for (const event of unqualifiedEvents) {
    unqualifiedByTrack.set(
      event.trackId,
      (unqualifiedByTrack.get(event.trackId) ?? 0) + 1
    );
  }

  const topTracks: TrackAnalyticsRow[] = tracks
    .map((t) => ({
      id: t.id,
      title: t.title,
      coverUrl: t.coverUrl,
      plays: t.plays + (unqualifiedByTrack.get(t.id) ?? 0),
      qualifiedPlays: t.plays,
      likes: t.likes.length,
      comments: t.comments.length,
      downloads: t.downloads,
    }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 8);

  const trend = buildTrend(events);

  return {
    hasEvents,
    trackCount: tracks.length,
    totalPlays,
    uniqueListeners,
    qualifiedPlays,
    avgListenedSeconds,
    completionRate,
    totalDownloads,
    totalLikes,
    totalComments,
    topTracks,
    trend,
  };
}

function buildTrend(
  events: { createdAt: Date; playedSeconds: number }[]
): AnalyticsSummary["trend"] {
  if (!events.length) return [];
  const days = 14;
  const buckets = new Map<string, { plays: number; seconds: number }>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    keys.push(key);
    buckets.set(key, { plays: 0, seconds: 0 });
  }
  for (const e of events) {
    const key = new Date(e.createdAt).toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (b) {
      b.plays += 1;
      b.seconds += e.playedSeconds;
    }
  }
  return keys.map((key) => ({
    date: key,
    plays: buckets.get(key)!.plays,
    seconds: Math.round(buckets.get(key)!.seconds),
  }));
}

// --- releases ---------------------------------------------------------------

type ReleaseWithTracks = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  coverUrl: string | null;
  releaseDate: Date | null;
  published: boolean;
  createdAt: Date;
  tracks: {
    id: string;
    position: number;
    trackId: string;
    track: {
      title: string;
      artist: string;
      coverUrl: string | null;
      duration: number | null;
    };
  }[];
};

function toRelease(r: ReleaseWithTracks): Release {
  const type = (["single", "ep", "album"].includes(r.type) ? r.type : "single") as Release["type"];
  return {
    id: r.id,
    title: r.title,
    type,
    description: r.description,
    coverUrl: r.coverUrl,
    releaseDate: r.releaseDate,
    published: r.published,
    createdAt: r.createdAt,
    tracks: r.tracks
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((rt) => ({
        id: rt.id,
        position: rt.position,
        trackId: rt.trackId,
        title: rt.track.title,
        artist: rt.track.artist,
        coverUrl: rt.track.coverUrl,
        duration: rt.track.duration,
      })),
  };
}

/** All releases owned by the current user (ownership scoped). */
export async function getReleases(): Promise<Release[]> {
  const session = await requireSession();
  // Release.creatorId is required (non-null) in the schema.
  const where = isAdmin(session) ? {} : { creatorId: session.user.id };
  const rows = await prisma.release.findMany({
    where,
    include: {
      tracks: { include: { track: true }, orderBy: { position: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRelease);
}

/** Owned tracks not yet assigned to the given release, for the picker. */
export async function getAssignableTracks(assignedTrackIds: string[]) {
  const session = await requireSession();
  const tracks = await prisma.track.findMany({
    where: ownerWhere(session),
    orderBy: { createdAt: "desc" },
  });
  const assigned = new Set(assignedTrackIds);
  return tracks.filter((t) => !assigned.has(t.id));
}
