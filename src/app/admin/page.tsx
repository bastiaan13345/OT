import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import Image from "next/image";
import { Music2, Play, TrendingUp, Upload, Plus, Eye, Heart, MessageCircle, Download } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDuration, formatPlays } from "@/lib/utils";
import { DeleteTrackButton } from "@/components/DeleteTrackButton";
import { authOptions } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const tracks = await prisma.track.findMany({
    where: session?.user.role === "ADMIN" ? undefined : { creatorId: session?.user.id },
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
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-zinc-500">Manage your music catalog</p>
        </div>
        <Link
          href="/admin/upload"
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-500 transition-colors"
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
            color: "text-brand-400 bg-brand-500/10",
          },
          {
            label: "Total Plays",
            value: formatPlays(totalPlays),
            icon: Play,
            color: "text-green-400 bg-green-500/10",
          },
          {
            label: "Likes",
            value: String(totalLikes),
            icon: Heart,
            color: "text-blue-400 bg-blue-500/10",
          },
          {
            label: "Comments",
            value: String(totalComments),
            icon: MessageCircle,
            color: "text-yellow-400 bg-yellow-500/10",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/5 bg-surface-800 p-6"
          >
            <div
              className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}
            >
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Track List */}
      <div className="rounded-xl border border-white/5 bg-surface-800 overflow-hidden">
        <div className="border-b border-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Your Tracks</h2>
        </div>

        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-white/5 p-6">
              <Music2 className="h-12 w-12 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No tracks yet
            </h3>
            <p className="text-zinc-500 mb-6">
              Upload your first track to get started
            </p>
            <Link
              href="/admin/upload"
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload Track
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors"
              >
                {/* Cover */}
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-surface-700">
                  {track.coverUrl ? (
                    <Image
                      src={track.coverUrl}
                      alt={track.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Music2 className="h-6 w-6 text-zinc-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-white">
                      {track.title}
                    </p>
                    {track.featured && <Badge>Featured</Badge>}
                    {!track.published && (
                      <Badge variant="warning">Draft</Badge>
                    )}
                    {track.allowDownload && <Badge>Download</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                    <span>{track.artist}</span>
                    {track.genre && (
                      <span className="text-brand-400">{track.genre}</span>
                    )}
                    {track.duration && (
                      <span>{formatDuration(track.duration)}</span>
                    )}
                    {track.license && <span>{track.license}</span>}
                  </div>
                </div>

                {/* Plays */}
                <div className="hidden md:grid grid-cols-3 gap-4 text-sm text-zinc-400">
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
                    href={`/track/${track.id}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
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
        <div className="rounded-xl border border-white/5 bg-surface-800 p-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <Eye className="h-4 w-4" />
            Published catalog
          </div>
          <div className="text-2xl font-bold text-white">{publishedCount}</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-surface-800 p-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <Download className="h-4 w-4" />
            Download-enabled tracks
          </div>
          <div className="text-2xl font-bold text-white">{downloadsEnabled}</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-surface-800 p-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
            <TrendingUp className="h-4 w-4" />
            Engagement rate
          </div>
          <div className="text-2xl font-bold text-white">
            {totalPlays ? `${Math.round(((totalLikes + totalComments) / totalPlays) * 100)}%` : "0%"}
          </div>
        </div>
      </div>
    </div>
  );
}
