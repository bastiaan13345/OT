"use client";

import { Trash2 } from "lucide-react";
import { deletePlaylist, removeTrackFromPlaylist, updatePlaylist } from "@/app/playlist/[id]/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type PlaylistControlsProps = {
  playlist: {
    id: string;
    name: string;
    description: string | null;
    public: boolean;
  };
};

export function PlaylistControls({ playlist }: PlaylistControlsProps) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <h2 className="text-lg font-semibold text-ink">Playlist settings</h2>
      <form action={updatePlaylist.bind(null, playlist.id)} className="mt-4 grid gap-3">
        <Input name="name" defaultValue={playlist.name} placeholder="Playlist name" required />
        <Input name="description" defaultValue={playlist.description ?? ""} placeholder="Description" />
        <label className="flex items-center gap-3 rounded-lg border border-line bg-canvas px-4 py-3 text-sm text-muted">
          <input
            type="checkbox"
            name="public"
            defaultChecked={playlist.public}
            className="h-4 w-4 rounded border-line bg-canvas accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          />
          Public playlist
        </label>
        <Button type="submit">Save changes</Button>
      </form>

      <form action={deletePlaylist.bind(null, playlist.id)} className="mt-4 border-t border-line pt-4">
        <Button type="submit" variant="danger" className="w-full">
          <Trash2 className="h-4 w-4" />
          Delete playlist
        </Button>
      </form>
    </div>
  );
}

type RemoveTrackButtonProps = {
  playlistId: string;
  trackId: string;
};

export function RemoveTrackButton({ playlistId, trackId }: RemoveTrackButtonProps) {
  return (
    <form action={removeTrackFromPlaylist.bind(null, playlistId, trackId)}>
      <button
        type="submit"
        className="rounded-lg p-2 text-muted transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
        aria-label="Remove track"
        title="Remove track"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
