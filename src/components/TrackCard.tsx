"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Heart, MoreHorizontal } from "lucide-react";
import { cn, formatDuration, formatPlays } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { Track } from "@prisma/client";

interface TrackCardProps {
  track: Track;
  onPlay?: (track: Track) => void;
  className?: string;
}

export function TrackCard({ track, onPlay, className }: TrackCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl bg-surface-700 border border-white/5 overflow-hidden hover:border-white/10 transition-all hover:bg-surface-600",
        className
      )}
    >
      {/* Cover */}
      <div className="relative aspect-square w-full overflow-hidden bg-surface-800">
        {track.coverUrl ? (
          <Image
            src={track.coverUrl}
            alt={track.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-zinc-600">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-zinc-700"
                    style={{ height: `${12 + Math.sin(i * 1.5) * 10}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onPlay?.(track)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-2xl shadow-brand-600/40 hover:bg-brand-500 hover:scale-105 transition-all"
            aria-label={`Play ${track.title}`}
          >
            <Play className="h-6 w-6 fill-current ml-0.5" />
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
            <Link href={`/track/${track.id}`}>
              <h3 className="truncate font-semibold text-white hover:text-brand-300 transition-colors">
                {track.title}
              </h3>
            </Link>
            <p className="truncate text-sm text-zinc-400">{track.artist}</p>
          </div>
          <button
            className="flex-shrink-0 rounded-lg p-1 text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            {track.genre && (
              <span className="text-brand-400">{track.genre}</span>
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
