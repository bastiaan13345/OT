import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Music2,
  Info,
  Activity,
  Wand2,
  ShieldCheck,
} from "lucide-react";
import { getStudioTrack } from "@/components/creator/data";
import {
  AnalyzeButton,
  EnhanceControls,
  ActivateVersionButton,
} from "@/components/creator/StudioControls";
import { ABComparePlayer } from "@/components/creator/ABComparePlayer";
import { AnalysisPanel } from "@/components/creator/AnalysisPanel";
import { VersionRow } from "@/components/creator/VersionRow";
import type { AudioVersion } from "@/components/creator/types";

export default async function StudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getStudioTrack(id);
  if (!data) notFound();

  const { track, versions, analysis, jobs } = data;

  const original = versions.find((v) => v.kind === "original") ?? null;
  const active = versions.find((v) => v.active) ?? null;
  const enhanced = versions
    .filter((v) => v.kind === "enhanced")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const activeJob = jobs.find(
    (j) => j.status === "pending" || j.status === "running"
  );
  const failedJob = jobs.find((j) => j.status === "failed");

  // A/B: compare the original against the newest enhanced (or the active one).
  const compareBase = original ?? active;
  const compareAgainst = enhanced[0] ?? active ?? original;
  const canCompare =
    !!compareBase &&
    !!compareAgainst &&
    compareBase.id !== compareAgainst.id;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:p-8">
      <Link
        href="/admin"
        className="mb-6 inline-flex items-center gap-2 rounded-sm text-sm text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-soft">
          {track.coverUrl ? (
            <Image src={track.coverUrl} alt={track.title} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music2 className="h-8 w-8 text-faint" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Creator Studio
          </p>
          <h1 className="truncate text-3xl font-bold text-ink">{track.title}</h1>
          <p className="mt-1 text-muted">{track.artist}</p>
        </div>
      </div>

      {/* Automated-enhancement disclosure (not generative AI) */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-line bg-soft p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-ink" />
        <p className="text-sm text-muted">
          Studio tools run <strong className="text-ink">locally with ffmpeg</strong> to
          measure and adjust your existing recording — loudness normalization and EQ
          presets. This is <strong className="text-ink">automated audio enhancement</strong>,
          not generative AI: no new instruments, vocals, or content are created, and your
          original file is always preserved.
        </p>
      </div>

      {/* Processing / error state */}
      {activeJob && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" />
          <p className="text-sm text-amber-900">
            {activeJob.type === "analyze" ? "Analyzing audio" : "Processing enhancement"}
            {activeJob.preset ? ` (${activeJob.preset})` : ""}… this page updates when it finishes.
          </p>
        </div>
      )}
      {failedJob && !activeJob && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-700" />
          <div className="text-sm">
            <p className="font-medium text-red-900">Last job failed</p>
            <p className="mt-0.5 text-red-800">
              {failedJob.error || "Processing failed. Try running it again."}
            </p>
          </div>
        </div>
      )}

      {/* Analysis */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Activity className="h-5 w-5 text-ink" /> Audio analysis
          </h2>
          <AnalyzeButton trackId={track.id} />
        </div>
        <AnalysisPanel analysis={analysis} />
      </section>

      {/* Enhance */}
      <section className="mb-6 rounded-xl border border-line bg-panel p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-ink">
          <Wand2 className="h-5 w-5 text-ink" /> Enhance
        </h2>
        <p className="mb-4 text-sm text-muted">
          Apply a loudness &amp; EQ preset with ffmpeg. Creates a new enhanced
          version — your current audio stays untouched until you set the new one active.
        </p>
        <EnhanceControls trackId={track.id} />
      </section>

      {/* Versions */}
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-ink">Versions</h2>
        <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-canvas">
          {versions.length === 0 ? (
            <div className="p-6 text-sm text-muted">
              No versions recorded yet. Click <strong className="text-ink">Run analysis</strong> above
              to register your original upload and measure its audio metrics, then use Enhance
              to create alternate versions you can compare and activate.
            </div>
          ) : (
            versions
              .slice()
              .sort((a: AudioVersion, b: AudioVersion) =>
                a.kind === "original" ? -1 : b.kind === "original" ? 1 : 0
              )
              .map((v) => <VersionRow key={v.id} version={v} />)
          )}
        </div>
      </section>

      {/* A/B compare */}
      {canCompare && compareBase && compareAgainst && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-ink">Compare versions</h2>
          <ABComparePlayer
            a={{
              id: compareBase.id,
              label: versionLabel(compareBase),
              audioUrl: versionStreamUrl(track.id, compareBase.id),
            }}
            b={{
              id: compareAgainst.id,
              label: versionLabel(compareAgainst),
              audioUrl: versionStreamUrl(track.id, compareAgainst.id),
            }}
          />
        </section>
      )}
    </div>
  );
}

function versionStreamUrl(trackId: string, versionId: string): string {
  return `/api/tracks/${trackId}/versions/${versionId}/stream`;
}

function versionLabel(v: AudioVersion): string {
  const base = v.kind === "enhanced" ? "Enhanced" : "Original";
  const withPreset = v.preset ? `${base} · ${v.preset}` : base;
  return v.active ? `${withPreset} (active)` : withPreset;
}
