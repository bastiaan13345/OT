import { prisma } from "@/lib/prisma";
import HomePage from "@/components/HomePage";

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Page() {
  const [featuredTracks, recentTracks, totalTracks, totalPlays, activeArtists] =
    await Promise.all([
      prisma.track.findMany({
        where: { featured: true, published: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.track.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.track.count({ where: { published: true } }),
      prisma.track.aggregate({
        where: { published: true },
        _sum: { plays: true },
      }),
      prisma.user.count({
        where: {
          role: "CREATOR",
          tracks: { some: { published: true } },
        },
      }),
    ]);

  return (
    <HomePage
      featuredTracks={featuredTracks}
      recentTracks={recentTracks}
      stats={{
        tracks: totalTracks,
        plays: totalPlays._sum.plays || 0,
        artists: activeArtists,
      }}
    />
  );
}
