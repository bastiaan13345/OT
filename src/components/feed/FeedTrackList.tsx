"use client";

import type { Track, User } from "@prisma/client";
import { Play } from "lucide-react";
import Link from "next/link";
import { usePlayer } from "@/components/providers/PlayerProvider";

type FeedTrack = Track & {
  creator: Pick<User, "id" | "name" | "bio"> | null;
};

export function FeedTrackList({ tracks }: { tracks: FeedTrack[] }) {
  const { playTrack } = usePlayer();

  return (
    <div className="space-y-4">
      {tracks.map((track, index) => (
        <article key={track.id} className="rounded-xl border border-line bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-muted">
                {track.creator ? (
                  <Link href={`/artist/${track.creator.id}`} className="rounded-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
                    {track.creator.name}
                  </Link>
                ) : (
                  track.artist
                )}{" "}
                released a track
              </p>
              <Link href={`/track/${track.id}`} className="mt-1 block rounded-sm text-xl font-semibold text-ink hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
                {track.title}
              </Link>
              <p className="mt-2 line-clamp-2 text-sm text-muted">
                {track.description || track.genre || "New music from an artist you follow."}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                playTrack(track, {
                  queue: tracks,
                  startIndex: index,
                  source: { label: "Following feed" },
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              <Play className="h-4 w-4 fill-current" />
              Play
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
