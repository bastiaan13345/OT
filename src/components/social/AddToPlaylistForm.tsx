"use client";

import { ListPlus } from "lucide-react";
import { addTrackToPlaylist } from "@/lib/actions";

interface AddToPlaylistFormProps {
  trackId: string;
  playlists: { id: string; name: string }[];
}

export function AddToPlaylistForm({ trackId, playlists }: AddToPlaylistFormProps) {
  if (!playlists.length) return null;

  return (
    <form action={(formData) => addTrackToPlaylist(trackId, formData)} className="flex items-center gap-2">
      <select
        name="playlistId"
        className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
      >
        {playlists.map((playlist) => (
          <option key={playlist.id} value={playlist.id}>
            {playlist.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
      >
        <ListPlus className="h-4 w-4" />
        Save
      </button>
    </form>
  );
}
