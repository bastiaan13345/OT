"use client";

import Image from "next/image";
import { Play, Pause, Music2, Clock, TrendingUp, ArrowLeft, Download, DollarSign } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatDuration, formatPlays } from "@/lib/utils";
import type { Track } from "@prisma/client";
import { usePlayer } from "@/components/providers/PlayerProvider";
import { LikeButton } from "@/components/social/LikeButton";
import { CommentForm } from "@/components/social/CommentForm";
import { AddToPlaylistForm } from "@/components/social/AddToPlaylistForm";

interface TrackDetailPageProps {
  track: Track & {
    creator?: { id: string; name: string; bio: string | null } | null;
    comments?: { id: string; body: string; timestampSeconds?: number | null; createdAt: Date; user: { name: string } }[];
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
  const player = usePlayer();
  const isActive = player.currentTrack?.id === track.id;
  const isPlaying = isActive && player.isPlaying;

  const handlePlay = () => {
    if (isActive) {
      player.togglePlay();
    } else {
      player.playTrack(track, {
        queue: [track],
        startIndex: 0,
        source: { label: `Track: ${track.title}` },
      });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/browse"
          className="mb-8 inline-flex items-center gap-2 rounded-md text-sm text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to browse
        </Link>

        <div className="flex flex-col md:flex-row gap-10">
          {/* Cover */}
          <div className="relative h-72 w-72 flex-shrink-0 self-start overflow-hidden rounded-2xl bg-soft shadow-xl shadow-black/10">
            {track.coverUrl ? (
              <Image
                src={track.coverUrl}
                alt={track.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Music2 className="h-24 w-24 text-faint" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col justify-end gap-4 flex-1">
            {track.genre && <Badge>{track.genre}</Badge>}

            <h1 className="text-4xl md:text-5xl font-bold text-ink tracking-tight">
              {track.title}
            </h1>
            <p className="text-xl text-muted">{track.artist}</p>
            {track.creator && (
              <Link href={`/artist/${track.creator.id}`} className="w-fit rounded-sm text-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
                View artist profile
              </Link>
            )}

            {track.description && (
              <p className="text-muted leading-relaxed">{track.description}</p>
            )}

            <div className="flex items-center gap-6 text-sm text-muted">
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
                className="flex items-center gap-3 rounded-xl bg-ink px-8 py-3.5 text-base font-semibold text-canvas shadow-lg shadow-black/10 transition-all hover:scale-105 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
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
                <Link href="/admin/login" className="rounded-xl border border-line bg-canvas px-4 py-3 text-sm font-semibold text-ink hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">
                  Sign in to like
                </Link>
              )}
              {track.allowDownload && (
                <a
                  href={`/api/tracks/${track.id}/download`}
                  download
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-canvas px-4 py-3 text-sm font-semibold text-ink hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
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
          <section className="rounded-xl border border-line bg-panel p-6">
            <h2 className="text-xl font-bold text-ink">Comments</h2>
            {signedIn ? (
              <CommentForm trackId={track.id} />
            ) : (
              <Link href="/admin/login" className="mt-4 inline-block rounded-sm text-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
                Sign in to comment
              </Link>
            )}
            <div className="mt-6 flex flex-col gap-4">
              {track.comments?.map((comment) => (
                <div key={comment.id} className="border-t border-line pt-4">
                  <div className="text-sm font-semibold text-ink">{comment.user.name}</div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {comment.timestampSeconds !== null && comment.timestampSeconds !== undefined && (
                      <button type="button" onClick={() => player.seek(comment.timestampSeconds!)} className="mr-2 rounded-full bg-soft px-2 py-0.5 font-mono text-xs text-ink hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
                        {formatDuration(comment.timestampSeconds)}
                      </button>
                    )}
                    {comment.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-xl border border-line bg-panel p-6">
            <h2 className="text-xl font-bold text-ink">Creator Tools</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm text-muted">
              {track.album && <div><span className="text-muted">Album:</span> {track.album}</div>}
              {track.license && <div><span className="text-muted">License:</span> {track.license}</div>}
              {track.tags && <div><span className="text-muted">Tags:</span> {track.tags}</div>}
              <div><span className="text-muted">Downloads:</span> {track.allowDownload ? "Enabled" : "Disabled"}</div>
            </div>
          </aside>
        </div>
      </div>
  );
}
