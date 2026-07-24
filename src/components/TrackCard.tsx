"use client";

import Image from "next/image";
import Link from "next/link";
import { Pause, Play, MoreHorizontal } from "lucide-react";
import { cn, formatDuration, formatPlays } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { usePlayer } from "@/components/providers/PlayerProvider";
import type { Track } from "@prisma/client";

interface TrackCardProps {
  track: Track;
  onPlay?: (track: Track) => void;
  queue?: Track[];
  sourceLabel?: string;
  className?: string;
}

export function TrackCard({ track, onPlay, queue, sourceLabel = "OpenTunes", className }: TrackCardProps) {
  const player = usePlayer();
  const isActive = player.currentTrack?.id === track.id;
  const isPlaying = isActive && player.isPlaying;

  const handlePlay = () => {
    if (onPlay) {
      onPlay(track);
      return;
    }

    if (isActive) {
      player.togglePlay();
      return;
    }

    const playQueue = queue?.length ? queue : [track];
    player.playTrack(track, {
      queue: playQueue,
      startIndex: Math.max(0, playQueue.findIndex((item) => item.id === track.id)),
      source: { label: sourceLabel },
    });
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-line bg-white transition-all hover:border-ink hover:bg-panel",
        className
      )}
    >
      {/* Cover */}
      <div className="relative aspect-square w-full overflow-hidden bg-soft">
        {track.coverUrl ? (
          <Image
            src={track.coverUrl}
            alt={track.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-faint">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-muted"
                    style={{ height: `${12 + Math.sin(i * 1.5) * 10}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            onClick={handlePlay}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-2xl shadow-black/20 transition-all hover:scale-105 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {track.featured && (
          <div className="absolute top-2 left-2">
            <Badge>Featured</Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/track/${track.id}`} className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
              <h3 className="truncate font-semibold text-ink transition-colors hover:text-black">
                {track.title}
              </h3>
            </Link>
            <p className="truncate text-sm text-muted">{track.artist}</p>
          </div>
          <button
            className="flex-shrink-0 rounded-lg p-1 text-faint transition-colors hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-1 flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-3">
            {track.genre && (
              <span className="text-ink">{track.genre}</span>
            )}
            {track.duration && (
              <span>{formatDuration(track.duration)}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Play className="h-3 w-3 fill-current" />
            <span>{formatPlays(track.plays)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
