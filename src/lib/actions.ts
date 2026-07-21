"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  return session;
}

async function requireTrackOwner(trackId: string) {
  const session = await requireUser();
  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) throw new Error("Track not found");
  if (session.user.role !== "ADMIN" && track.creatorId !== session.user.id) {
    throw new Error("You do not have permission to manage this track.");
  }
  return { session, track };
}

export async function registerCreator(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !email || password.length < 8) {
    throw new Error("Name, email, and an 8 character password are required.");
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
      role: "CREATOR",
    },
  });

  redirect("/admin/login?registered=1");
}

export async function uploadTrack(formData: FormData) {
  const session = await requireUser();

  const title = formData.get("title") as string;
  const artist = (formData.get("artist") as string) || session.user.name || "Untitled artist";
  const genre = formData.get("genre") as string | null;
  const description = formData.get("description") as string | null;
  const album = formData.get("album") as string | null;
  const tags = formData.get("tags") as string | null;
  const license = formData.get("license") as string | null;
  const price = formData.get("price") as string | null;
  const releaseDate = formData.get("releaseDate") as string | null;
  const allowDownload = formData.get("allowDownload") === "on";
  const featured = formData.get("featured") === "on";
  const published = formData.get("published") !== "draft";
  const audioFile = formData.get("audio") as File | null;
  const coverFile = formData.get("cover") as File | null;

  if (!title || !artist || !audioFile) {
    throw new Error("Title, artist, and audio file are required.");
  }

  // Ensure upload dirs exist
  const audioDir = join(process.cwd(), "public/uploads/audio");
  const coverDir = join(process.cwd(), "public/uploads/covers");
  await mkdir(audioDir, { recursive: true });
  await mkdir(coverDir, { recursive: true });

  // Save audio file
  const audioExt = audioFile.name.split(".").pop() || "mp3";
  const audioFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${audioExt}`;
  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
  await writeFile(join(audioDir, audioFileName), audioBuffer);
  const audioUrl = `/uploads/audio/${audioFileName}`;

  // Save cover file if provided
  let coverUrl: string | null = null;
  if (coverFile && coverFile.size > 0) {
    const coverExt = coverFile.name.split(".").pop() || "jpg";
    const coverFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${coverExt}`;
    const coverBuffer = Buffer.from(await coverFile.arrayBuffer());
    await writeFile(join(coverDir, coverFileName), coverBuffer);
    coverUrl = `/uploads/covers/${coverFileName}`;
  }

  await prisma.track.create({
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
      audioUrl,
      coverUrl,
      featured: session.user.role === "ADMIN" ? featured : false,
      published,
      creatorId: session.user.role === "ADMIN" ? null : session.user.id,
    },
  });

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

  // Clean up files from disk
  try {
    if (track.audioUrl) {
      await unlink(join(process.cwd(), "public", track.audioUrl));
    }
    if (track.coverUrl) {
      await unlink(join(process.cwd(), "public", track.coverUrl));
    }
  } catch {
    // Files may not exist; continue with DB deletion
  }

  await prisma.track.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/admin");
}

export async function incrementPlays(id: string) {
  await prisma.track.update({
    where: { id },
    data: { plays: { increment: 1 } },
  });
}

export async function toggleLike(trackId: string) {
  const session = await requireUser();
  const existing = await prisma.like.findUnique({
    where: { userId_trackId: { userId: session.user.id, trackId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({
      data: { userId: session.user.id, trackId },
    });
  }

  revalidatePath(`/track/${trackId}`);
}

export async function addComment(trackId: string, formData: FormData) {
  const session = await requireUser();
  const body = String(formData.get("body") || "").trim();
  if (!body) throw new Error("Comment cannot be empty.");

  await prisma.comment.create({
    data: { body, trackId, userId: session.user.id },
  });

  revalidatePath(`/track/${trackId}`);
}

export async function toggleFollow(creatorId: string) {
  const session = await requireUser();
  if (session.user.id === creatorId) return;

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: creatorId,
      },
    },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({
      data: { followerId: session.user.id, followingId: creatorId },
    });
  }

  revalidatePath(`/artist/${creatorId}`);
}

export async function createPlaylist(formData: FormData) {
  const session = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!name) throw new Error("Playlist name is required.");

  await prisma.playlist.create({
    data: {
      name,
      description: description || null,
      userId: session.user.id,
    },
  });

  revalidatePath("/library");
}

export async function addTrackToPlaylist(trackId: string, formData: FormData) {
  const session = await requireUser();
  const playlistId = String(formData.get("playlistId") || "");
  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, userId: session.user.id },
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
  const session = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const website = String(formData.get("website") || "").trim();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name || session.user.name || "Creator",
      bio: bio || null,
      location: location || null,
      website: website || null,
    },
  });

  revalidatePath("/admin/profile");
}
