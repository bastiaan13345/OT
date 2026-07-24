import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Clock3 } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HistoryTrackList } from "@/components/feed/HistoryTrackList";

function getDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/admin/login");

  const events = await prisma.playbackEvent.findMany({
    where: { userId: session.user.id, track: { published: true } },
    include: { track: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const deduped = Array.from(new Map(events.map((event) => [event.trackId, event])).values());
  const grouped = deduped.reduce<Record<string, typeof deduped>>((groups, event) => {
    const key = event.updatedAt.toISOString().slice(0, 10);
    groups[key] = groups[key] || [];
    groups[key].push(event);
    return groups;
  }, {});

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-10">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-soft text-ink">
          <Clock3 className="h-6 w-6" />
        </div>
        <h1 className="text-4xl font-bold text-ink">Listening History</h1>
        <p className="mt-2 text-muted">A deduped record of tracks you have recently played, grouped by date.</p>
      </div>

      {Object.keys(grouped).length ? (
        <div className="space-y-8">
          {Object.entries(grouped).map(([dateKey, items]) => (
            <section key={dateKey}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                {getDayLabel(new Date(`${dateKey}T00:00:00`))}
              </h2>
              <HistoryTrackList items={items} />
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-panel p-8 text-muted">
          Listening history will appear after you play tracks while signed in.
        </div>
      )}
    </div>
  );
}
