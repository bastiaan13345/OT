import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import TrackDetailPage from "@/components/TrackDetailPage";
import { authOptions } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const track = await prisma.track.findUnique({
    where: { id, published: true },
    include: {
      creator: { select: { id: true, name: true, bio: true } },
      comments: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      likes: true,
    },
  });

  if (!track) notFound();

  const playlists = session
    ? await prisma.playlist.findMany({
        where: { userId: session.user.id },
        select: { id: true, name: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  return (
    <TrackDetailPage
      track={track}
      liked={Boolean(track.likes.find((like) => like.userId === session?.user.id))}
      likeCount={track.likes.length}
      playlists={playlists}
      signedIn={Boolean(session)}
    />
  );
}
