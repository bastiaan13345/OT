import "server-only";

import { unlink, writeFile } from "fs/promises";
import { join } from "path";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  ensureUploadDir,
  publicUrl,
  uniqueFileName,
} from "@/lib/audio/storage";
import {
  sanitizeBaseName,
  validateAudioFile,
  validateImageFile,
} from "@/lib/audio/validate";
import { validateImageMagic } from "@/lib/audio/image";
import { probeDurationSec } from "@/lib/audio/ffmpeg";
import {
  CurrentActorError,
  resolveCurrentCreator,
  type CurrentActorDependencies,
} from "@/lib/auth/actor";
import { parseAlbumMembership, type AlbumMembership } from "./upload-membership";

export class TrackUploadError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "TrackUploadError";
  }
}

function invalid(message: string): never {
  throw new TrackUploadError(message);
}

const defaultActorDeps: CurrentActorDependencies = {
  findUserById: (id) =>
    prisma.user.findUnique({ where: { id }, select: { id: true, role: true } }),
  findAdminById: (id) =>
    prisma.admin.findUnique({ where: { id }, select: { id: true, email: true } }),
  findUserByEmail: (email) =>
    prisma.user.findUnique({ where: { email }, select: { id: true, role: true } }),
};

export async function createTrackFromUpload(
  formData: FormData,
  session: Session
): Promise<{ trackId: string; position: number | null }> {
  // Resolve the creator through the database, not a potentially stale JWT claim.
  let creatorId: string;
  let dbRole: string;
  try {
    const actor = await resolveCurrentCreator(session, defaultActorDeps);
    creatorId = actor.userId;
    dbRole = actor.role;
  } catch (error) {
    if (error instanceof CurrentActorError) {
      throw new TrackUploadError(error.message, error.status);
    }
    throw error;
  }

  // Parse album membership (releaseId + position + creationKey) or null for
  // a standalone single-track upload. Parser errors map to TrackUploadError.
  let membership: AlbumMembership | null;
  try {
    membership = parseAlbumMembership(formData);
  } catch (error) {
    throw new TrackUploadError(
      error instanceof Error ? error.message : "Invalid album membership."
    );
  }
  const singleCreationKey =
    String(formData.get("creationKey") ?? "").trim() || null;
  const creationKey = membership?.creationKey ?? singleCreationKey;

  const title = String(formData.get("title") || "");
  const artist = String(
    formData.get("artist") || session.user.name || "Untitled artist"
  );
  const genre = String(formData.get("genre") || "");
  const description = String(formData.get("description") || "");
  const album = String(formData.get("album") || "");
  const tags = String(formData.get("tags") || "");
  const license = String(formData.get("license") || "");
  const price = String(formData.get("price") || "").trim();
  const releaseDate = String(formData.get("releaseDate") || "").trim();
  const allowDownload = formData.get("allowDownload") === "on";
  const featured = formData.get("featured") === "on";
  const published = formData.get("published") !== "draft";
  const audioEntry = formData.get("audio");
  const coverEntry = formData.get("cover");
  const audioFile = audioEntry instanceof File ? audioEntry : null;
  const coverFile = coverEntry instanceof File ? coverEntry : null;

  const parsedPrice = price ? Number(price) : null;
  if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
    invalid("Price must be a non-negative number.");
  }

  const parsedReleaseDate = releaseDate ? new Date(releaseDate) : null;
  if (parsedReleaseDate && Number.isNaN(parsedReleaseDate.getTime())) {
    invalid("Release date is invalid.");
  }

  // --- Idempotency: if this creationKey already resolved, return early. ---
  if (creationKey) {
    const existing = await prisma.track.findUnique({
      where: { creationKey },
      select: { id: true, creatorId: true },
    });
    if (existing && existing.creatorId === creatorId) {
      let position: number | null = null;
      if (membership) {
        const rt = await prisma.releaseTrack.findUnique({
          where: {
            releaseId_trackId: {
              releaseId: membership.releaseId,
              trackId: existing.id,
            },
          },
          select: { position: true },
        });
        position = rt?.position ?? null;
      }
      return { trackId: existing.id, position };
    }
  }

  // --- Validate release ownership for album uploads. ---
  let releaseCoverUrl: string | null = null;
  if (membership) {
    const release = await prisma.release.findUnique({
      where: { id: membership.releaseId },
      select: { id: true, creatorId: true, coverUrl: true },
    });
    if (!release) invalid("The selected album could not be found.");
    if (release.creatorId !== creatorId && dbRole !== "ADMIN") {
      invalid("You can only add tracks to your own albums.");
    }
    releaseCoverUrl = release.coverUrl;
  }

  if (!title.trim() || !artist.trim() || !audioFile) {
    invalid("Title, artist, and audio file are required.");
  }
  if (title.trim().length > 200 || artist.trim().length > 200) {
    invalid("Title and artist must be 200 characters or fewer.");
  }

  const audioCheck = validateAudioFile(audioFile);
  if (!audioCheck.ok) invalid(audioCheck.message);

  const hasCover = Boolean(coverFile && coverFile.size > 0);
  const coverCheck = hasCover ? validateImageFile(coverFile!) : null;
  if (coverCheck && !coverCheck.ok) invalid(coverCheck.message);
  if (hasCover && coverCheck?.ok) {
    const magicCheck = await validateImageMagic(coverFile!);
    if (!magicCheck.ok) invalid(magicCheck.message);
  }

  const writtenAbsPaths: string[] = [];

  try {
    const audioDir = await ensureUploadDir("audio");
    const audioFileName = uniqueFileName(
      sanitizeBaseName(audioFile.name),
      audioCheck.ext
    );
    const audioAbs = join(audioDir, audioFileName);
    await writeFile(audioAbs, Buffer.from(await audioFile.arrayBuffer()));
    writtenAbsPaths.push(audioAbs);
    const audioUrl = publicUrl("audio", audioFileName);

    let coverUrl: string | null = null;
    if (hasCover && coverFile && coverCheck?.ok) {
      const coverDir = await ensureUploadDir("covers");
      const coverFileName = uniqueFileName(
        sanitizeBaseName(coverFile.name),
        coverCheck.ext
      );
      const coverAbs = join(coverDir, coverFileName);
      await writeFile(coverAbs, Buffer.from(await coverFile.arrayBuffer()));
      writtenAbsPaths.push(coverAbs);
      coverUrl = publicUrl("covers", coverFileName);
    } else if (membership && releaseCoverUrl) {
      // Inherit the shared album cover when no per-track cover is supplied.
      coverUrl = releaseCoverUrl;
    }

    const durationSec = await probeDurationSec(audioAbs);
    if (durationSec == null || durationSec <= 0) {
      invalid("The uploaded file could not be decoded as audio.");
    }
    const duration = Math.round(durationSec);

    const result = await prisma.$transaction(async (tx) => {
      const createdTrack = await tx.track.create({
        data: {
          title: title.trim(),
          artist: artist.trim(),
          genre: genre.trim() || null,
          description: description.trim() || null,
          album: album.trim() || null,
          tags: tags.trim() || null,
          license: license.trim() || null,
          price: parsedPrice,
          releaseDate: parsedReleaseDate,
          allowDownload,
          audioUrl,
          coverUrl,
          duration,
          featured: dbRole === "ADMIN" ? featured : false,
          published,
          creatorId,
          creationKey: creationKey || undefined,
        },
      });

      await tx.audioVersion.create({
        data: {
          trackId: createdTrack.id,
          kind: "original",
          label: "Original upload",
          url: audioUrl,
          format: audioCheck.ext.replace(/^\./, ""),
          duration: durationSec,
          sizeBytes: audioFile.size,
          active: true,
        },
      });

      if (membership) {
        await tx.releaseTrack.create({
          data: {
            releaseId: membership.releaseId,
            trackId: createdTrack.id,
            position: membership.position,
          },
        });
      }

      return createdTrack;
    });

    return { trackId: result.id, position: membership?.position ?? null };
  } catch (error) {
    await Promise.all(writtenAbsPaths.map((path) => unlink(path).catch(() => {})));

    if (error instanceof TrackUploadError) throw error;
    // P2002 is the Prisma unique constraint violation – a concurrent duplicate
    // upload with the same creationKey raced us; treat as an idempotent retry.
    if ((error as { code?: string } | null)?.code === "P2002" && creationKey) {
      const raced = await prisma.track.findUnique({
        where: { creationKey },
        select: { id: true, creatorId: true },
      });
      if (raced && raced.creatorId === creatorId) {
        let position: number | null = null;
        if (membership) {
          const rt = await prisma.releaseTrack.findUnique({
            where: {
              releaseId_trackId: {
                releaseId: membership.releaseId,
                trackId: raced.id,
              },
            },
            select: { position: true },
          });
          position = rt?.position ?? null;
        }
        return { trackId: raced.id, position };
      }
    }
    console.error("Track upload failed", error);
    throw new TrackUploadError("Upload failed. Please try again.", 500);
  }
}
