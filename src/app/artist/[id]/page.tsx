import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { MapPin, Link as LinkIcon, Music2, Users, Play } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPlays } from "@/lib/utils";
import { TrackCard } from "@/components/TrackCard";
import { FollowButton } from "@/components/social/FollowButton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ArtistPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const artist = await prisma.user.findUnique({
    where: { id },
    include: {
      tracks: { where: { published: true }, orderBy: { createdAt: "desc" } },
      followers: true,
      following: true,
    },
  });

  if (!artist) notFound();

  const isFollowing = session
    ? Boolean(
        await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: session.user.id,
              followingId: artist.id,
            },
          },
        })
      )
    : false;
  const totalPlays = artist.tracks.reduce((sum, track) => sum + track.plays, 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <section className="mb-12 rounded-xl border border-white/5 bg-surface-800 p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-600/20">
              <Music2 className="h-9 w-9 text-brand-400" />
            </div>
            <h1 className="text-4xl font-bold text-white">{artist.name}</h1>
            {artist.bio && <p className="mt-3 max-w-2xl text-zinc-400">{artist.bio}</p>}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-500">
              {artist.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {artist.location}
                </span>
              )}
              {artist.website && (
                <a href={artist.website} className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300">
                  <LinkIcon className="h-4 w-4" />
                  Website
                </a>
              )}
            </div>
          </div>
          {session?.user.id !== artist.id && <FollowButton creatorId={artist.id} isFollowing={isFollowing} />}
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/5 pt-6">
          <div>
            <div className="flex items-center gap-2 text-zinc-500"><Music2 className="h-4 w-4" /> Tracks</div>
            <div className="mt-1 text-2xl font-bold text-white">{artist.tracks.length}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-zinc-500"><Users className="h-4 w-4" /> Followers</div>
            <div className="mt-1 text-2xl font-bold text-white">{artist.followers.length}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-zinc-500"><Play className="h-4 w-4" /> Plays</div>
            <div className="mt-1 text-2xl font-bold text-white">{formatPlays(totalPlays)}</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold text-white">Tracks</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {artist.tracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      </section>
    </div>
  );
}
