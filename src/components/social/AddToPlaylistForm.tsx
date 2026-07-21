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
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        {playlists.map((playlist) => (
          <option key={playlist.id} value={playlist.id}>
            {playlist.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
      >
        <ListPlus className="h-4 w-4" />
        Save
      </button>
    </form>
  );
}
