"use client";

import type { Track } from "@prisma/client";
import { Play } from "lucide-react";
import Link from "next/link";
import { usePlayer } from "@/components/providers/PlayerProvider";
import { formatDuration } from "@/lib/utils";

type HistoryItem = {
  id: string;
  source: string | null;
  playedSeconds: number;
  completed: boolean;
  updatedAt: Date;
  track: Track;
};

export function HistoryTrackList({ items }: { items: HistoryItem[] }) {
  const { playTrack } = usePlayer();
  const tracks = items.map((item) => item.track);

  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-white">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-4 p-4 transition-colors hover:bg-panel">
          <button
            type="button"
            onClick={() =>
              playTrack(item.track, {
                queue: tracks,
                startIndex: index,
                source: { label: "Listening history" },
              })
            }
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ink text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            aria-label={`Play ${item.track.title}`}
          >
            <Play className="h-4 w-4 fill-current" />
          </button>
          <div className="min-w-0 flex-1">
            <Link href={`/track/${item.track.id}`} className="truncate rounded-sm font-medium text-ink hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
              {item.track.title}
            </Link>
            <p className="truncate text-sm text-muted">{item.track.artist}</p>
          </div>
          <div className="hidden text-right text-xs text-muted sm:block">
            <p>{item.source || "OpenTunes"}</p>
            <p>{formatDuration(Math.floor(item.playedSeconds))}{item.completed ? " listened" : ""}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
