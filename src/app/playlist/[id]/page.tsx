import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, Globe2, Lock, Music2 } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/utils";
import { PlayQueueButton } from "@/components/library/PlayQueueButton";
import { PlaylistControls, RemoveTrackButton } from "@/components/library/PlaylistControls";

type PlaylistPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlaylistPage({ params }: PlaylistPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      tracks: {
        include: { track: true },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!playlist) notFound();

  const isOwner = session?.user?.id === playlist.userId;
  if (!playlist.public && !isOwner) notFound();

  const tracks = playlist.tracks
    .map((item) => item.track)
    .filter((track) => track.published || isOwner);
  const totalSeconds = tracks.reduce((sum, track) => sum + (track.duration ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <section className="mb-8 rounded-xl border border-line bg-panel p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-soft text-ink">
              <Music2 className="h-9 w-9" />
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                {playlist.public ? <Globe2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {playlist.public ? "Public" : "Private"}
              </span>
              <span>{tracks.length} tracks</span>
              {totalSeconds > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatDuration(totalSeconds)}
                </span>
              )}
            </div>
            <h1 className="text-4xl font-bold text-ink">{playlist.name}</h1>
            <p className="mt-2 text-muted">
              By <Link href={`/artist/${playlist.user.id}`} className="rounded-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">{playlist.user.name}</Link>
            </p>
            {playlist.description && <p className="mt-4 max-w-2xl text-muted">{playlist.description}</p>}
          </div>
          <PlayQueueButton tracks={tracks} source={`Playlist: ${playlist.name}`} />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          {tracks.length ? (
            <div className="divide-y divide-line rounded-xl border border-line bg-canvas">
              {tracks.map((track, index) => (
                <div key={track.id} className="flex items-center gap-4 p-4 transition-colors hover:bg-panel">
                  <div className="w-6 text-right text-sm text-muted">{index + 1}</div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/track/${track.id}`} className="truncate rounded-sm font-medium text-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
                      {track.title}
                    </Link>
                    <p className="truncate text-sm text-muted">{track.artist}</p>
                  </div>
                  {track.duration && <span className="hidden text-sm text-muted sm:block">{formatDuration(track.duration)}</span>}
                  {isOwner && <RemoveTrackButton playlistId={playlist.id} trackId={track.id} />}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-panel p-8 text-muted">
              This playlist does not have any playable tracks yet.
            </div>
          )}
        </section>

        {isOwner && <PlaylistControls playlist={playlist} />}
      </div>
    </div>
  );
}
