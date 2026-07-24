"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/admin/login");
  return session.user.id;
}

async function requirePlaylistOwner(playlistId: string) {
  const userId = await requireUserId();
  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, userId },
    select: { id: true },
  });

  if (!playlist) {
    throw new Error("Playlist not found or you do not have permission to manage it.");
  }

  return userId;
}

export async function updatePlaylist(playlistId: string, formData: FormData) {
  const userId = await requirePlaylistOwner(playlistId);
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const isPublic = formData.get("public") === "on";

  if (!name) throw new Error("Playlist name is required.");

  await prisma.playlist.update({
    where: { id: playlistId },
    data: {
      name,
      description: description || null,
      public: isPublic,
    },
  });

  revalidatePath("/library");
  revalidatePath(`/playlist/${playlistId}`);
  revalidatePath(`/artist/${userId}`);
}

export async function deletePlaylist(playlistId: string) {
  await requirePlaylistOwner(playlistId);

  await prisma.playlist.delete({ where: { id: playlistId } });

  revalidatePath("/library");
  redirect("/library");
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string) {
  await requirePlaylistOwner(playlistId);

  await prisma.playlistTrack.deleteMany({
    where: { playlistId, trackId },
  });

  revalidatePath("/library");
  revalidatePath(`/playlist/${playlistId}`);
}
