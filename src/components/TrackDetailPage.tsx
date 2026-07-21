"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, Pause, Music2, Clock, TrendingUp, ArrowLeft, Download, DollarSign } from "lucide-react";
import Link from "next/link";
import { AudioPlayer } from "@/components/player/AudioPlayer";
import { Badge } from "@/components/ui/Badge";
import { formatDuration, formatPlays } from "@/lib/utils";
import type { Track } from "@prisma/client";
import { LikeButton } from "@/components/social/LikeButton";
import { CommentForm } from "@/components/social/CommentForm";
import { AddToPlaylistForm } from "@/components/social/AddToPlaylistForm";

interface TrackDetailPageProps {
  track: Track & {
    creator?: { id: string; name: string; bio: string | null } | null;
    comments?: { id: string; body: string; createdAt: Date; user: { name: string } }[];
  };
  liked: boolean;
  likeCount: number;
  playlists: { id: string; name: string }[];
  signedIn: boolean;
}

export default function TrackDetailPage({
  track,
  liked,
  likeCount,
  playlists,
  signedIn,
}: TrackDetailPageProps) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const isPlaying = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isPlaying) {
      setCurrentTrack(null);
    } else {
      setCurrentTrack(track);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/browse"
          className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to browse
        </Link>

        <div className="flex flex-col md:flex-row gap-10">
          {/* Cover */}
          <div className="relative h-72 w-72 flex-shrink-0 self-start overflow-hidden rounded-2xl bg-surface-700 shadow-2xl">
            {track.coverUrl ? (
              <Image
                src={track.coverUrl}
                alt={track.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Music2 className="h-24 w-24 text-zinc-700" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col justify-end gap-4 flex-1">
            {track.genre && <Badge>{track.genre}</Badge>}

            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              {track.title}
            </h1>
            <p className="text-xl text-zinc-400">{track.artist}</p>
            {track.creator && (
              <Link href={`/artist/${track.creator.id}`} className="text-sm font-medium text-brand-400 hover:text-brand-300">
                View artist profile
              </Link>
            )}

            {track.description && (
              <p className="text-zinc-500 leading-relaxed">{track.description}</p>
            )}

            <div className="flex items-center gap-6 text-sm text-zinc-500">
              {track.duration && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(track.duration)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                <span>{formatPlays(track.plays)} plays</span>
              </div>
              {track.price !== null && track.price !== undefined && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  <span>{track.price === 0 ? "Free" : `$${track.price.toFixed(2)}`}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2">
              <button
                onClick={handlePlay}
                className="flex items-center gap-3 rounded-xl bg-brand-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 hover:scale-105 transition-all"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-5 w-5 fill-current" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                    Play Track
                  </>
                )}
              </button>
              {signedIn ? (
                <LikeButton trackId={track.id} liked={liked} count={likeCount} />
              ) : (
                <Link href="/admin/login" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/10">
                  Sign in to like
                </Link>
              )}
              {track.allowDownload && (
                <a
                  href={track.audioUrl}
                  download
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/10 hover:text-white"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              )}
            </div>
            {signedIn && <AddToPlaylistForm trackId={track.id} playlists={playlists} />}
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-[1fr_320px]">
          <section className="rounded-xl border border-white/5 bg-surface-800 p-6">
            <h2 className="text-xl font-bold text-white">Comments</h2>
            {signedIn ? (
              <CommentForm trackId={track.id} />
            ) : (
              <Link href="/admin/login" className="mt-4 inline-block text-sm font-medium text-brand-400 hover:text-brand-300">
                Sign in to comment
              </Link>
            )}
            <div className="mt-6 flex flex-col gap-4">
              {track.comments?.map((comment) => (
                <div key={comment.id} className="border-t border-white/5 pt-4">
                  <div className="text-sm font-semibold text-white">{comment.user.name}</div>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{comment.body}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-xl border border-white/5 bg-surface-800 p-6">
            <h2 className="text-xl font-bold text-white">Creator Tools</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm text-zinc-400">
              {track.album && <div><span className="text-zinc-500">Album:</span> {track.album}</div>}
              {track.license && <div><span className="text-zinc-500">License:</span> {track.license}</div>}
              {track.tags && <div><span className="text-zinc-500">Tags:</span> {track.tags}</div>}
              <div><span className="text-zinc-500">Downloads:</span> {track.allowDownload ? "Enabled" : "Disabled"}</div>
            </div>
          </aside>
        </div>
      </div>

      <AudioPlayer track={currentTrack} />
    </>
  );
}
