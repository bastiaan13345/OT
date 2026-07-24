import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Music2, Play, TrendingUp, Upload, Plus, Eye, Heart, MessageCircle, Download, SlidersHorizontal, BarChart3, Disc3 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDuration, formatPlays } from "@/lib/utils";
import { DeleteTrackButton } from "@/components/DeleteTrackButton";
import { authOptions } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  if (session.user.role !== "CREATOR" && session.user.role !== "ADMIN") {
    redirect("/library");
  }
  const tracks = await prisma.track.findMany({
    where: session.user.role === "ADMIN" ? undefined : { creatorId: session.user.id },
    include: {
      likes: true,
      comments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalPlays = tracks.reduce((acc, t) => acc + t.plays, 0);
  const totalLikes = tracks.reduce((acc, t) => acc + t.likes.length, 0);
  const totalComments = tracks.reduce((acc, t) => acc + t.comments.length, 0);
  const publishedCount = tracks.filter((t) => t.published).length;
  const downloadsEnabled = tracks.filter((t) => t.allowDownload).length;

  return (
    <div className="px-4 py-8 sm:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink">Dashboard</h1>
          <p className="mt-1 text-muted">Manage your music catalog</p>
        </div>
        <Link
          href="/admin/upload"
          className="flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Upload Track
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Tracks",
            value: String(tracks.length),
            icon: Music2,
            color: "text-ink bg-soft",
          },
          {
            label: "Total Plays",
            value: formatPlays(totalPlays),
            icon: Play,
            color: "text-ink bg-soft",
          },
          {
            label: "Likes",
            value: String(totalLikes),
            icon: Heart,
            color: "text-ink bg-soft",
          },
          {
            label: "Comments",
            value: String(totalComments),
            icon: MessageCircle,
            color: "text-ink bg-soft",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-line bg-panel p-6"
          >
            <div
              className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}
            >
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-ink">{stat.value}</div>
            <div className="text-sm text-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick navigation to creator tools */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { href: "/admin/upload", label: "Upload a track", desc: "Add new music to your catalog", icon: Upload },
          { href: "/admin/releases", label: "Manage releases", desc: "Singles, EPs & albums", icon: Disc3 },
          { href: "/admin/analytics", label: "View analytics", desc: "Plays, listeners & trends", icon: BarChart3 },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-4 rounded-xl border border-line bg-white p-5 transition-colors hover:border-ink hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-soft text-ink transition-colors group-hover:bg-white">
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-ink">{item.label}</p>
              <p className="text-sm text-muted">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Track List */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-6">
          <h2 className="text-lg font-semibold text-ink">Your Tracks</h2>
          <span className="text-xs text-muted">
            Open a track in Studio to analyze &amp; enhance audio
          </span>
        </div>

        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-soft p-6">
              <Music2 className="h-12 w-12 text-faint" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-ink">
              No tracks yet
            </h3>
            <p className="mb-6 text-muted">
              Upload your first track to get started
            </p>
            <Link
              href="/admin/upload"
              className="flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              <Upload className="h-4 w-4" />
              Upload Track
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-panel"
              >
                {/* Cover */}
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-soft">
                  {track.coverUrl ? (
                    <Image
                      src={track.coverUrl}
                      alt={track.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Music2 className="h-6 w-6 text-faint" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-ink">
                      {track.title}
                    </p>
                    {track.featured && <Badge>Featured</Badge>}
                    {!track.published && (
                      <Badge variant="warning">Draft</Badge>
                    )}
                    {track.allowDownload && <Badge>Download</Badge>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted">
                    <span>{track.artist}</span>
                    {track.genre && (
                      <span className="text-ink">{track.genre}</span>
                    )}
                    {track.duration && (
                      <span>{formatDuration(track.duration)}</span>
                    )}
                    {track.license && <span>{track.license}</span>}
                  </div>
                </div>

                {/* Plays */}
                <div className="hidden grid-cols-3 gap-4 text-sm text-muted md:grid">
                  <span className="flex items-center gap-1.5">
                    <Play className="h-3.5 w-3.5 fill-current" />
                    {formatPlays(track.plays)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5" />
                    {track.likes.length}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {track.comments.length}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/studio/${track.id}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                    title="Open in Creator Studio"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/track/${track.id}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                    title="View public page"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <DeleteTrackButton id={track.id} title={track.title} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-line bg-panel p-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted">
            <Eye className="h-4 w-4" />
            Published catalog
          </div>
          <div className="text-2xl font-bold text-ink">{publishedCount}</div>
        </div>
        <div className="rounded-xl border border-line bg-panel p-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted">
            <Download className="h-4 w-4" />
            Download-enabled tracks
          </div>
          <div className="text-2xl font-bold text-ink">{downloadsEnabled}</div>
        </div>
        <div className="rounded-xl border border-line bg-panel p-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted">
            <TrendingUp className="h-4 w-4" />
            Engagement rate
          </div>
          <div className="text-2xl font-bold text-ink">
            {totalPlays ? `${Math.round(((totalLikes + totalComments) / totalPlays) * 100)}%` : "0%"}
          </div>
        </div>
      </div>
    </div>
  );
}
