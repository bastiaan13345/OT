import Link from "next/link";
import Image from "next/image";
import {
  BarChart3,
  Play,
  Users,
  CheckCircle2,
  Timer,
  Percent,
  Download,
  Heart,
  MessageCircle,
  Music2,
  TrendingUp,
} from "lucide-react";
import { getAnalytics } from "@/components/creator/data";
import { formatPlays, formatDuration } from "@/lib/utils";

export default async function AnalyticsPage() {
  const a = await getAnalytics();

  const stats = [
    { label: "Playback starts", value: formatPlays(a.totalPlays), icon: Play, color: "text-ink bg-soft" },
    { label: "Unique listeners", value: formatPlays(a.uniqueListeners), icon: Users, color: "text-ink bg-soft" },
    { label: "Qualified plays", value: formatPlays(a.qualifiedPlays), icon: CheckCircle2, color: "text-ink bg-soft", hint: "Reached listening threshold" },
    { label: "Avg listened", value: a.avgListenedSeconds ? formatDuration(a.avgListenedSeconds) : "—", icon: Timer, color: "text-ink bg-soft" },
    { label: "Completion rate", value: `${a.completionRate}%`, icon: Percent, color: "text-ink bg-soft" },
    { label: "Downloads", value: formatPlays(a.totalDownloads), icon: Download, color: "text-ink bg-soft" },
    { label: "Likes", value: formatPlays(a.totalLikes), icon: Heart, color: "text-ink bg-soft" },
    { label: "Comments", value: formatPlays(a.totalComments), icon: MessageCircle, color: "text-ink bg-soft" },
  ];

  const maxTrendPlays = Math.max(1, ...a.trend.map((t) => t.plays));

  return (
    <div className="px-4 py-8 sm:p-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-soft">
          <BarChart3 className="h-6 w-6 text-ink" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-ink">Analytics</h1>
          <p className="mt-1 text-muted">
            Playback insights derived from real listening events across your catalog.
          </p>
        </div>
      </div>

      {!a.hasEvents && (
        <div className="mb-6 rounded-xl border border-line bg-panel p-4 text-sm text-muted">
          No playback events recorded yet. Engagement totals below reflect stored
          counts; detailed listening metrics (unique listeners, completion, trend)
          populate once your tracks are streamed.
        </div>
      )}

      {/* Stat grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-panel p-5">
            <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${s.color}`}>
              <s.icon className="h-4.5 w-4.5" />
            </div>
            <div className="text-2xl font-bold text-ink">{s.value}</div>
            <div className="text-sm text-muted">{s.label}</div>
            {s.hint && <div className="mt-0.5 text-xs text-muted">{s.hint}</div>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Trend */}
        <div className="rounded-xl border border-line bg-white p-6 lg:col-span-3">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted" />
            <h2 className="text-lg font-semibold text-ink">Last 14 days</h2>
          </div>
          {a.trend.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <p className="text-sm text-muted">No playback events in this window.</p>
              <p className="mt-1 text-xs text-muted">
                A chart appears here once listens are recorded — no placeholder data shown.
              </p>
            </div>
          ) : (
            <div className="flex h-48 items-end gap-1.5" role="img" aria-label="Daily plays over the last 14 days">
              {a.trend.map((point) => (
                <div key={point.date} className="group flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-ink/70 transition-all group-hover:bg-ink"
                      style={{ height: `${(point.plays / maxTrendPlays) * 100}%` }}
                      title={`${point.date}: ${point.plays} plays`}
                    />
                  </div>
                  <span className="text-[10px] text-muted">
                    {point.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top tracks */}
        <div className="rounded-xl border border-line bg-white p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-ink">Top tracks</h2>
          {a.topTracks.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <Music2 className="mb-3 h-10 w-10 text-faint" />
              <p className="text-sm text-muted">No tracks yet.</p>
            </div>
          ) : (
            <ol className="flex flex-col divide-y divide-line">
              {a.topTracks.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-4 text-sm font-semibold text-muted">{i + 1}</span>
                  <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded bg-soft">
                    {t.coverUrl ? (
                      <Image src={t.coverUrl} alt={t.title} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music2 className="h-4 w-4 text-faint" />
                      </div>
                    )}
                  </div>
                  <Link href={`/admin/studio/${t.id}`} className="min-w-0 flex-1 truncate rounded-sm text-sm font-medium text-ink transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
                    {t.title}
                  </Link>
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Play className="h-3 w-3 fill-current" />
                    {formatPlays(t.plays)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
