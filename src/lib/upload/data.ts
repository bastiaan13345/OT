import "server-only";

import type { User } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mapPreset, mapPreviousTrack, uploadSuggestionsFromRows } from "./data-mappers";
import type { UploadPresetView, UploadStudioData } from "./types";

export const CREATOR_SETTINGS_UNAVAILABLE =
  "You need a creator profile before you can manage upload preferences.";

type UploadSettingsData = {
  concurrency: number;
  presets: UploadPresetView[];
  error?: string;
};

/** Resolves the persisted creator record for an authenticated creator session. */
export async function requireUploadCreator(): Promise<User | null> {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/login");
  }

  if (session.user.role !== "CREATOR" && session.user.role !== "ADMIN") {
    redirect("/library");
  }

  const byId = session.user.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;

  if (byId) {
    return byId;
  }

  const email = session.user.email?.trim().toLowerCase();

  return email ? prisma.user.findUnique({ where: { email } }) : null;
}

/** Upload-page presets, prior owned tracks, and metadata suggestions. */
export async function getUploadStudioData(): Promise<UploadStudioData> {
  const creator = await requireUploadCreator();

  if (!creator) {
    return {
      concurrency: 2,
      suggestions: { artist: [], genre: [], tags: [], license: [], album: [] },
      presets: [],
    };
  }

  const [presets, tracks] = await Promise.all([
    prisma.uploadPreset.findMany({
      where: { userId: creator.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.track.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        artist: true,
        genre: true,
        album: true,
        tags: true,
        license: true,
        description: true,
        price: true,
        releaseDate: true,
        allowDownload: true,
        published: true,
      },
    }),
  ]);

  return {
    concurrency: creator.uploadConcurrency,
    suggestions: uploadSuggestionsFromRows(tracks),
    presets: [...presets.map(mapPreset), ...tracks.map(mapPreviousTrack)],
  };
}

/** Creator-owned upload preferences; admins are never allowed to read another creator's presets. */
export async function getUploadSettingsData(): Promise<UploadSettingsData> {
  const creator = await requireUploadCreator();

  if (!creator) {
    return {
      concurrency: 2,
      presets: [],
      error: CREATOR_SETTINGS_UNAVAILABLE,
    };
  }

  const presets = await prisma.uploadPreset.findMany({
    where: { userId: creator.id },
    orderBy: { updatedAt: "desc" },
  });

  return {
    concurrency: creator.uploadConcurrency,
    presets: presets.map(mapPreset),
  };
}
