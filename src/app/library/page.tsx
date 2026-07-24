import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, Heart, ListMusic, Plus, Radio, Users } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPlaylist } from "@/lib/actions";
import { TrackCard } from "@/components/TrackCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PlayQueueButton } from "@/components/library/PlayQueueButton";

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/admin/login");

  const [likes, playlists, recentEvents, followedArtists] = await Promise.all([
    prisma.like.findMany({
      where: { userId: session.user.id, track: { published: true } },
      include: { track: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.playlist.findMany({
      where: { userId: session.user.id },
      include: { tracks: { include: { track: true }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.playbackEvent.findMany({
      where: { userId: session.user.id, track: { published: true } },
      include: { track: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.follow.findMany({
      where: { followerId: session.user.id },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            bio: true,
            tracks: { where: { published: true }, select: { id: true }, take: 1 },
            followers: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const recentTracks = Array.from(
    new Map(recentEvents.map((event) => [event.trackId, event.track])).values()
  ).slice(0, 8);
  const likedTracks = likes.map((like) => like.track);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-ink">Library</h1>
          <p className="mt-2 text-muted">Your saved music, playlists, listening activity, and followed artists.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/feed" className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-ink hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">
            <Radio className="h-4 w-4" />
            Feed
          </Link>
          <Link href="/history" className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-ink hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">
            <Clock3 className="h-4 w-4" />
            History
          </Link>
        </div>
      </div>

      <div className="mb-10 rounded-xl border border-line bg-panel p-6">
        <div className="mb-4 flex items-center gap-3">
          <Plus className="h-5 w-5 text-ink" />
          <h2 className="text-lg font-semibold text-ink">Create playlist</h2>
        </div>
        <form action={createPlaylist} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input name="name" placeholder="Playlist name" required />
          <Input name="description" placeholder="Description" />
          <Button type="submit">Create</Button>
        </form>
      </div>

      <section className="mb-12">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5 text-ink" />
            <h2 className="text-2xl font-bold text-ink">Liked Tracks</h2>
          </div>
          <PlayQueueButton tracks={likedTracks} source="Liked tracks" variant="secondary" />
        </div>
        {likedTracks.length ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {likedTracks.map((track) => <TrackCard key={track.id} track={track} />)}
          </div>
        ) : (
          <p className="rounded-xl border border-line bg-panel p-6 text-muted">Tracks you like will appear here.</p>
        )}
      </section>

      <section className="mb-12">
        <div className="mb-5 flex items-center gap-3">
          <ListMusic className="h-5 w-5 text-ink" />
          <h2 className="text-2xl font-bold text-ink">Playlists</h2>
        </div>
        {playlists.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {playlists.map((playlist) => (
              <Link key={playlist.id} href={`/playlist/${playlist.id}`} className="rounded-xl border border-line bg-white p-5 transition-colors hover:border-ink hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-ink">{playlist.name}</h3>
                    {playlist.description && <p className="mt-1 text-sm text-muted">{playlist.description}</p>}
                  </div>
                  <span className="text-xs text-muted">{playlist.public ? "Public" : "Private"}</span>
                </div>
                <p className="mt-3 text-sm text-muted">{playlist.tracks.length} tracks</p>
                <div className="mt-4 flex flex-col gap-2">
                  {playlist.tracks.slice(0, 4).map((item) => (
                    <span key={item.id} className="truncate text-sm text-ink">{item.track.title} - {item.track.artist}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-line bg-panel p-6 text-muted">Create playlists to organize albums, sets, and favorites.</p>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-ink" />
              <h2 className="text-2xl font-bold text-ink">Recent Listening</h2>
            </div>
            <Link href="/history" className="rounded-sm text-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">View all</Link>
          </div>
          {recentTracks.length ? (
            <div className="space-y-3 rounded-xl border border-line bg-white p-4">
              {recentTracks.map((track) => (
                <Link key={track.id} href={`/track/${track.id}`} className="block rounded-lg px-3 py-2 hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
                  <p className="truncate font-medium text-ink">{track.title}</p>
                  <p className="truncate text-sm text-muted">{track.artist}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-line bg-panel p-6 text-muted">Recent plays will appear after you listen.</p>
          )}
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-ink" />
              <h2 className="text-2xl font-bold text-ink">Followed Artists</h2>
            </div>
            <Link href="/feed" className="rounded-sm text-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">Open feed</Link>
          </div>
          {followedArtists.length ? (
            <div className="space-y-3 rounded-xl border border-line bg-white p-4">
              {followedArtists.map(({ following }) => (
                <Link key={following.id} href={`/artist/${following.id}`} className="block rounded-lg px-3 py-2 hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
                  <p className="font-medium text-ink">{following.name}</p>
                  <p className="text-sm text-muted">{following.tracks.length} recent tracks · {following.followers.length} followers</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-line bg-panel p-6 text-muted">Follow artists to build a personalized release feed.</p>
          )}
        </section>
      </div>
    </div>
  );
}
