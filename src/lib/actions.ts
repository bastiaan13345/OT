"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { unlink, writeFile } from "fs/promises";
import { join } from "path";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { ensureUploadDir, publicUrl, resolvePublicPath, uniqueFileName } from "@/lib/audio/storage";
import { sanitizeBaseName, validateImageFile } from "@/lib/audio/validate";
import { probeDurationSec } from "@/lib/audio/ffmpeg";
import { analyzeAudioFile } from "@/lib/audio/analyze";
import {
  enhanceAudioFile,
  isEnhancePreset,
  ENHANCE_PRESETS,
} from "@/lib/audio/enhance";
import { createTrackFromUpload } from "@/lib/tracks/upload";
import { shouldDeleteSharedCover } from "@/lib/releases/cover";

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  return session;
}

async function requireCreator() {
  const session = await requireUser();
  if (session.user.role !== "CREATOR" && session.user.role !== "ADMIN") {
    throw new Error("A creator account is required for this action.");
  }
  return session;
}

async function persistedUserId(session: Awaited<ReturnType<typeof requireUser>>) {
  const direct = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (direct) return direct.id;

  if (session.user.email) {
    const byEmail = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  throw new Error("This account is not linked to a platform user.");
}

async function requireTrackOwner(trackId: string) {
  const session = await requireCreator();
  const userId = await persistedUserId(session);
  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) throw new Error("Track not found");
  if (session.user.role !== "ADMIN" && track.creatorId !== userId) {
    throw new Error("You do not have permission to manage this track.");
  }
  return { session, track };
}

export async function registerUser(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "LISTENER").toUpperCase();

  if (!name || !email || password.length < 8) {
    throw new Error("Name, email, and an 8 character password are required.");
  }
  if (name.length > 100) throw new Error("Display name is too long.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Password must be 72 bytes or fewer.");
  }
  if (role !== "LISTENER" && role !== "CREATOR") {
    throw new Error("Choose a listener or creator account.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  const existingAdmin = await prisma.admin.findUnique({ where: { email } });
  if (existingUser || existingAdmin) {
    throw new Error("An account with this email already exists.");
  }

  await prisma.user.create({
    data: {
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
    },
  });

  redirect("/admin/login?registered=1");
}

export async function uploadTrack(formData: FormData) {
  const session = await requireCreator();
  await createTrackFromUpload(formData, session);

  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateTrack(id: string, formData: FormData) {
  const { session } = await requireTrackOwner(id);

  const title = formData.get("title") as string;
  const artist = formData.get("artist") as string;
  const genre = formData.get("genre") as string | null;
  const description = formData.get("description") as string | null;
  const album = formData.get("album") as string | null;
  const tags = formData.get("tags") as string | null;
  const license = formData.get("license") as string | null;
  const price = formData.get("price") as string | null;
  const releaseDate = formData.get("releaseDate") as string | null;
  const allowDownload = formData.get("allowDownload") === "on";
  const featured = formData.get("featured") === "on";
  const published = formData.get("published") === "on";

  await prisma.track.update({
    where: { id },
    data: {
      title,
      artist,
      genre: genre || null,
      description: description || null,
      album: album || null,
      tags: tags || null,
      license: license || null,
      price: price ? Number(price) : null,
      releaseDate: releaseDate ? new Date(releaseDate) : null,
      allowDownload,
      featured: session.user.role === "ADMIN" ? featured : undefined,
      published,
    },
  });

  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function deleteTrack(id: string) {
  const { track } = await requireTrackOwner(id);
  const versions = await prisma.audioVersion.findMany({
    where: { trackId: id },
    select: { url: true },
  });

  await prisma.track.delete({ where: { id } });

  // Audio files are unique to this track; always clean them up.
  const audioUrls = new Set([
    track.audioUrl,
    ...versions.map((version) => version.url),
  ].filter((url): url is string => Boolean(url)));
  await Promise.all(
    [...audioUrls].map(async (url) => {
      const path = resolvePublicPath(url);
      if (path) await unlink(path).catch(() => {});
    })
  );

  // The cover may be shared with other tracks or a release; reference-count it.
  if (track.coverUrl?.startsWith("/uploads/covers/")) {
    const [remainingReleaseReferences, remainingTrackReferences] = await Promise.all([
      prisma.release.count({ where: { coverUrl: track.coverUrl } }),
      prisma.track.count({ where: { coverUrl: track.coverUrl } }),
    ]);
    if (shouldDeleteSharedCover(
      track.coverUrl,
      remainingReleaseReferences,
      remainingTrackReferences
    )) {
      const coverPath = resolvePublicPath(track.coverUrl);
      if (coverPath) await unlink(coverPath).catch(() => {});
    }
  }

  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/admin");
}

export async function toggleLike(trackId: string) {
  const session = await requireUser();
  const userId = await persistedUserId(session);
  const existing = await prisma.like.findUnique({
    where: { userId_trackId: { userId, trackId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({
      data: { userId, trackId },
    });
  }

  revalidatePath(`/track/${trackId}`);
}

export async function addComment(trackId: string, formData: FormData) {
  const session = await requireUser();
  const userId = await persistedUserId(session);
  const body = String(formData.get("body") || "").trim();
  if (!body) throw new Error("Comment cannot be empty.");
  const rawTimestamp = formData.get("timestampSeconds");
  const timestampSeconds = rawTimestamp === null || rawTimestamp === ""
    ? null
    : Math.max(0, Math.floor(Number(rawTimestamp)));
  if (timestampSeconds !== null && !Number.isFinite(timestampSeconds)) {
    throw new Error("Invalid comment timestamp.");
  }

  await prisma.comment.create({
    data: { body, trackId, userId, timestampSeconds },
  });

  revalidatePath(`/track/${trackId}`);
}

export async function toggleFollow(creatorId: string) {
  const session = await requireUser();
  const followerId = await persistedUserId(session);
  if (followerId === creatorId) return;

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId: creatorId,
      },
    },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({
      data: { followerId, followingId: creatorId },
    });
  }

  revalidatePath(`/artist/${creatorId}`);
}

export async function createPlaylist(formData: FormData) {
  const session = await requireUser();
  const userId = await persistedUserId(session);
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!name) throw new Error("Playlist name is required.");

  await prisma.playlist.create({
    data: {
      name,
      description: description || null,
      userId,
    },
  });

  revalidatePath("/library");
}

export async function addTrackToPlaylist(trackId: string, formData: FormData) {
  const session = await requireUser();
  const userId = await persistedUserId(session);
  const playlistId = String(formData.get("playlistId") || "");
  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, userId },
  });
  if (!playlist) throw new Error("Playlist not found.");

  await prisma.playlistTrack.upsert({
    where: { playlistId_trackId: { playlistId, trackId } },
    update: {},
    create: { playlistId, trackId },
  });

  revalidatePath("/library");
  revalidatePath(`/track/${trackId}`);
}

export async function updateCreatorProfile(formData: FormData) {
  const session = await requireCreator();
  const userId = await persistedUserId(session);
  const name = String(formData.get("name") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const websiteInput = String(formData.get("website") || "").trim();
  const avatarEntry = formData.get("avatar");
  const avatarFile = avatarEntry instanceof File && avatarEntry.size > 0 ? avatarEntry : null;
  const removeAvatar = formData.get("removeAvatar") === "true";

  if (name.length > 100) throw new Error("Display name is too long.");
  if (bio.length > 2_000) throw new Error("Bio is too long.");
  if (location.length > 120) throw new Error("Location is too long.");

  let website: string | null = null;
  if (websiteInput) {
    try {
      const parsed = new URL(websiteInput);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error();
      }
      website = parsed.toString();
    } catch {
      throw new Error("Website must be a valid http or https URL.");
    }
  }

  const existingUser = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
  let nextAvatarUrl = removeAvatar ? null : existingUser?.avatarUrl || null;
  let newAvatarPath: string | null = null;

  if (avatarFile) {
    const avatarCheck = validateImageFile(avatarFile);
    if (!avatarCheck.ok) throw new Error(avatarCheck.message);
    const avatarDir = await ensureUploadDir("covers");
    const avatarName = uniqueFileName(`avatar-${sanitizeBaseName(avatarFile.name)}`, avatarCheck.ext);
    newAvatarPath = join(avatarDir, avatarName);
    await writeFile(newAvatarPath, Buffer.from(await avatarFile.arrayBuffer()));
    nextAvatarUrl = publicUrl("covers", avatarName);
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || session.user.name || "Creator",
        bio: bio || null,
        location: location || null,
        website,
        avatarUrl: nextAvatarUrl,
      },
    });
  } catch (error) {
    if (newAvatarPath) await unlink(newAvatarPath).catch(() => {});
    throw error;
  }

  if (existingUser?.avatarUrl && existingUser.avatarUrl !== nextAvatarUrl) {
    const oldAvatarPath = resolvePublicPath(existingUser.avatarUrl);
    if (oldAvatarPath) await unlink(oldAvatarPath).catch(() => {});
  }

  revalidatePath("/admin/profile");
  revalidatePath(`/artist/${userId}`);
}

// ---------------------------------------------------------------------------
// Audio: analysis, enhancement, version activation (owner/admin only)
// ---------------------------------------------------------------------------

/**
 * Resolve the AudioVersion to operate on. If `versionId` is given it must
 * belong to the track; otherwise the active version is used, falling back to
 * the most recent original.
 */
async function resolveVersion(trackId: string, versionId?: string | null) {
  if (versionId) {
    const v = await prisma.audioVersion.findFirst({
      where: { id: versionId, trackId },
    });
    if (!v) throw new Error("Audio version not found for this track.");
    return v;
  }
  const active = await prisma.audioVersion.findFirst({
    where: { trackId, active: true },
  });
  if (active) return active;
  const original = await prisma.audioVersion.findFirst({
    where: { trackId },
    orderBy: { createdAt: "asc" },
  });
  if (original) return original;

  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track?.audioUrl) return null;

  const absPath = resolvePublicPath(track.audioUrl);
  const durationSec = absPath ? await probeDurationSec(absPath) : null;
  return prisma.audioVersion.create({
    data: {
      trackId,
      kind: "original",
      label: "Original upload",
      url: track.audioUrl,
      format: track.audioUrl.split(".").pop()?.toLowerCase() || null,
      duration: durationSec ?? track.duration,
      active: true,
    },
  });
}

/**
 * Run deterministic local signal analysis over a track's audio and persist the
 * result. Records a ProcessingJob for observability. Returns the analysis id
 * and suggestions. Owner/admin only.
 */
export async function analyzeTrack(trackId: string, versionId?: string) {
  const { session } = await requireTrackOwner(trackId);
  const userId = await persistedUserId(session);
  const version = await resolveVersion(trackId, versionId);

  const sourceUrl = version?.url ?? null;
  const abs = sourceUrl ? resolvePublicPath(sourceUrl) : null;

  const job = await prisma.processingJob.create({
    data: {
      trackId,
      audioVersionId: version?.id ?? null,
      userId,
      type: "analyze",
      status: "running",
      startedAt: new Date(),
    },
  });

  try {
    if (!abs) throw new Error("No audio file available to analyze.");
    const result = await analyzeAudioFile(abs);

    const analysis = await prisma.audioAnalysis.create({
      data: {
        trackId,
        audioVersionId: version?.id ?? null,
        durationSec: result.durationSec,
        codec: result.codec,
        sampleRate: result.sampleRate,
        channels: result.channels,
        bitrate: result.bitrate,
        loudnessLufs: result.loudnessLufs,
        loudnessRange: result.loudnessRange,
        truePeakDb: result.truePeakDb,
        peakDb: result.peakDb,
        clippingPct: result.clippingPct,
        silencePct: result.silencePct,
        suggestions: JSON.stringify(result.suggestions),
        provider: result.provider,
      },
    });

    await prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        progress: 100,
        finishedAt: new Date(),
        result: JSON.stringify({ analysisId: analysis.id }),
      },
    });

    revalidatePath(`/track/${trackId}`);
    revalidatePath("/admin");
    return { analysisId: analysis.id, suggestions: result.suggestions };
  } catch (err) {
    await prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: err instanceof Error ? err.message : "Analysis failed.",
      },
    });
    throw err;
  }
}

/**
 * Produce an immutable enhanced AudioVersion using a local preset
 * (balanced | warm | bright). The source is always an existing version's file
 * and is never modified. The new version is NOT auto-activated — callers use
 * `activateAudioVersion` to switch playback. Owner/admin only.
 */
export async function enhanceTrack(
  trackId: string,
  preset: string,
  versionId?: string
) {
  const { session } = await requireTrackOwner(trackId);
  const userId = await persistedUserId(session);
  if (!isEnhancePreset(preset)) {
    throw new Error("Unknown enhancement preset.");
  }

  const source = await resolveVersion(trackId, versionId);
  const sourceUrl = source?.url ?? null;
  const sourceAbs = sourceUrl ? resolvePublicPath(sourceUrl) : null;

  const job = await prisma.processingJob.create({
    data: {
      trackId,
      audioVersionId: source?.id ?? null,
      userId,
      type: "enhance",
      status: "running",
      preset,
      startedAt: new Date(),
    },
  });

  let producedUrl: string | null = null;
  try {
    if (!sourceAbs) throw new Error("No source audio file available to enhance.");
    const out = await enhanceAudioFile(sourceAbs, preset);
    producedUrl = out.url;

    const version = await prisma.audioVersion.create({
      data: {
        trackId,
        kind: "enhanced",
        preset,
        label: `${ENHANCE_PRESETS[preset].label} enhancement`,
        url: out.url,
        format: out.format,
        bitrate: out.bitrate,
        sizeBytes: out.sizeBytes,
        duration: out.duration,
        active: false,
      },
    });

    await prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        progress: 100,
        finishedAt: new Date(),
        audioVersionId: version.id,
        result: JSON.stringify({ audioVersionId: version.id, url: out.url }),
      },
    });

    revalidatePath(`/track/${trackId}`);
    revalidatePath("/admin");
    return { audioVersionId: version.id, preset };
  } catch (err) {
    // Clean up a partially-written enhanced file on failure.
    if (producedUrl) {
      const p = resolvePublicPath(producedUrl);
      if (p) await unlink(p).catch(() => {});
    }
    await prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: err instanceof Error ? err.message : "Enhancement failed.",
      },
    });
    throw err;
  }
}

/**
 * Select which immutable AudioVersion is active for a track. Exactly one version
 * is active at a time; the choice is mirrored onto Track.audioUrl (and duration)
 * so the rest of the app transparently streams/downloads the active rendition.
 */
export async function activateAudioVersion(trackId: string, versionId: string) {
  await requireTrackOwner(trackId);
  if (!versionId) throw new Error("A version id is required.");

  const version = await prisma.audioVersion.findFirst({
    where: { id: versionId, trackId },
  });
  if (!version) throw new Error("Audio version not found for this track.");

  await prisma.$transaction([
    prisma.audioVersion.updateMany({
      where: { trackId },
      data: { active: false },
    }),
    prisma.audioVersion.update({
      where: { id: version.id },
      data: { active: true },
    }),
    prisma.track.update({
      where: { id: trackId },
      data: {
        audioUrl: version.url,
        duration: version.duration != null ? Math.round(version.duration) : undefined,
      },
    }),
  ]);

  revalidatePath(`/track/${trackId}`);
  revalidatePath("/admin");
  return { activeVersionId: version.id };
}

// ---------------------------------------------------------------------------
// Playlist management (owner-scoped)
// ---------------------------------------------------------------------------

async function requirePlaylistOwner(playlistId: string) {
  const session = await requireUser();
  const userId = await persistedUserId(session);
  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist) throw new Error("Playlist not found.");
  if (session.user.role !== "ADMIN" && playlist.userId !== userId) {
    throw new Error("You do not have permission to manage this playlist.");
  }
  return { session, playlist };
}

export async function updatePlaylist(playlistId: string, formData: FormData) {
  await requirePlaylistOwner(playlistId);
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const isPublic = formData.get("public") === "on";
  if (!name) throw new Error("Playlist name is required.");
  if (name.length > 120) throw new Error("Playlist name is too long.");

  await prisma.playlist.update({
    where: { id: playlistId },
    data: { name, description: description || null, public: isPublic },
  });

  revalidatePath("/library");
}

export async function deletePlaylist(playlistId: string) {
  await requirePlaylistOwner(playlistId);
  await prisma.playlist.delete({ where: { id: playlistId } });
  revalidatePath("/library");
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string
) {
  await requirePlaylistOwner(playlistId);
  await prisma.playlistTrack.deleteMany({ where: { playlistId, trackId } });
  revalidatePath("/library");
  revalidatePath(`/track/${trackId}`);
}

// ---------------------------------------------------------------------------
// Release management (creator-owned)
// ---------------------------------------------------------------------------

const RELEASE_TYPES = new Set(["single", "ep", "album"]);

async function requireReleaseOwner(releaseId: string) {
  const session = await requireCreator();
  const userId = await persistedUserId(session);
  const release = await prisma.release.findUnique({ where: { id: releaseId } });
  if (!release) throw new Error("Release not found.");
  if (session.user.role !== "ADMIN" && release.creatorId !== userId) {
    throw new Error("You do not have permission to manage this release.");
  }
  return { session, release };
}

export async function createRelease(formData: FormData) {
  const session = await requireCreator();
  const creatorId = await persistedUserId(session);
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const typeRaw = String(formData.get("type") || "single").trim().toLowerCase();
  const type = RELEASE_TYPES.has(typeRaw) ? typeRaw : "single";
  const releaseDate = String(formData.get("releaseDate") || "").trim();
  const published = formData.get("published") !== "draft";

  if (!title) throw new Error("Release title is required.");
  if (title.length > 200) throw new Error("Release title is too long.");
  const parsedReleaseDate = releaseDate ? new Date(releaseDate) : null;
  if (parsedReleaseDate && Number.isNaN(parsedReleaseDate.getTime())) {
    throw new Error("Release date is invalid.");
  }

  const release = await prisma.release.create({
    data: {
      title,
      description: description || null,
      type,
      releaseDate: parsedReleaseDate,
      published,
      creatorId,
    },
  });

  revalidatePath("/admin");
  return { releaseId: release.id };
}

export async function deleteRelease(releaseId: string) {
  const { release } = await requireReleaseOwner(releaseId);
  await prisma.release.delete({ where: { id: releaseId } });

  if (release.coverUrl?.startsWith("/uploads/covers/")) {
    const [remainingReleaseReferences, remainingTrackReferences] = await Promise.all([
      prisma.release.count({ where: { coverUrl: release.coverUrl } }),
      prisma.track.count({ where: { coverUrl: release.coverUrl } }),
    ]);
    if (shouldDeleteSharedCover(
      release.coverUrl,
      remainingReleaseReferences,
      remainingTrackReferences
    )) {
      const coverPath = resolvePublicPath(release.coverUrl);
      if (coverPath) await unlink(coverPath).catch(() => {});
    }
  }

  revalidatePath("/admin");
}

/**
 * Assign a track to a release at an ordered position. The caller must own both
 * the release and the track (or be an admin). Idempotent per (release, track).
 */
export async function assignTrackToRelease(
  releaseId: string,
  trackId: string,
  position?: number
) {
  await requireReleaseOwner(releaseId);
  await requireTrackOwner(trackId);

  const pos =
    typeof position === "number" && Number.isFinite(position) && position >= 0
      ? Math.floor(position)
      : await prisma.releaseTrack.count({ where: { releaseId } });

  await prisma.releaseTrack.upsert({
    where: { releaseId_trackId: { releaseId, trackId } },
    update: { position: pos },
    create: { releaseId, trackId, position: pos },
  });

  revalidatePath("/admin");
  return { releaseId, trackId, position: pos };
}

export async function removeTrackFromRelease(releaseId: string, trackId: string) {
  await requireReleaseOwner(releaseId);
  await prisma.releaseTrack.deleteMany({ where: { releaseId, trackId } });
  revalidatePath("/admin");
}
