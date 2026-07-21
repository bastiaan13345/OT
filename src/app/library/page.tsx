import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, ListMusic, Plus } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPlaylist } from "@/lib/actions";
import { TrackCard } from "@/components/TrackCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const [likes, playlists] = await Promise.all([
    prisma.like.findMany({
      where: { userId: session.user.id },
      include: { track: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.playlist.findMany({
      where: { userId: session.user.id },
      include: { tracks: { include: { track: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white">Library</h1>
        <p className="mt-2 text-zinc-400">Liked tracks and playlists saved to your account.</p>
      </div>

      <div className="mb-10 rounded-xl border border-white/5 bg-surface-800 p-6">
        <div className="mb-4 flex items-center gap-3">
          <Plus className="h-5 w-5 text-brand-400" />
          <h2 className="text-lg font-semibold text-white">Create playlist</h2>
        </div>
        <form action={createPlaylist} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input name="name" placeholder="Playlist name" required />
          <Input name="description" placeholder="Description" />
          <Button type="submit">Create</Button>
        </form>
      </div>

      <section className="mb-12">
        <div className="mb-5 flex items-center gap-3">
          <Heart className="h-5 w-5 text-red-400" />
          <h2 className="text-2xl font-bold text-white">Liked Tracks</h2>
        </div>
        {likes.length ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {likes.map((like) => (
              <TrackCard key={like.id} track={like.track} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-white/5 bg-surface-800 p-6 text-zinc-500">
            Tracks you like will appear here.
          </p>
        )}
      </section>

      <section>
        <div className="mb-5 flex items-center gap-3">
          <ListMusic className="h-5 w-5 text-brand-400" />
          <h2 className="text-2xl font-bold text-white">Playlists</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="rounded-xl border border-white/5 bg-surface-800 p-5">
              <h3 className="font-semibold text-white">{playlist.name}</h3>
              {playlist.description && <p className="mt-1 text-sm text-zinc-500">{playlist.description}</p>}
              <p className="mt-3 text-sm text-zinc-400">{playlist.tracks.length} tracks</p>
              <div className="mt-4 flex flex-col gap-2">
                {playlist.tracks.slice(0, 4).map((item) => (
                  <Link key={item.id} href={`/track/${item.track.id}`} className="text-sm text-zinc-300 hover:text-brand-300">
                    {item.track.title} - {item.track.artist}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
