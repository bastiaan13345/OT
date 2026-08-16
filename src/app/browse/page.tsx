import { prisma } from "@/lib/prisma";
import BrowsePage from "@/components/BrowsePage";

export const dynamic = "force-dynamic";

export default async function Page() {
  const tracks = await prisma.track.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
  });

  return <BrowsePage tracks={tracks} />;
}
