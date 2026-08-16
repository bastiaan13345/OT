import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Radio } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeedTrackList } from "@/components/feed/FeedTrackList";

export default async function FeedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/admin/login");

  const follows = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const followingIds = follows.map((follow) => follow.followingId);

  const tracks = followingIds.length
    ? await prisma.track.findMany({
        where: { published: true, creatorId: { in: followingIds } },
        include: { creator: { select: { id: true, name: true, bio: true } } },
        orderBy: [{ releaseDate: "desc" }, { createdAt: "desc" }],
        take: 40,
      })
    : [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-10">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-soft text-ink">
          <Radio className="h-6 w-6" />
        </div>
        <h1 className="text-4xl font-bold text-ink">Following Feed</h1>
        <p className="mt-2 text-muted">Recent published tracks from artists you follow.</p>
      </div>

      {tracks.length ? (
        <FeedTrackList tracks={tracks} />
      ) : (
        <div className="rounded-xl border border-line bg-panel p-8 text-muted">
          <p>Your feed is empty until followed artists publish tracks.</p>
          <Link href="/browse" className="mt-4 inline-flex rounded-lg bg-ink px-4 py-2 text-sm font-medium text-canvas hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">
            Find artists
          </Link>
        </div>
      )}
    </div>
  );
}
