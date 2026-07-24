import { Sparkles, FileAudio } from "lucide-react";
import { ActivateVersionButton } from "./StudioControls";
import type { AudioVersion } from "./types";

const KIND_META: Record<
  AudioVersion["kind"],
  { label: string; icon: typeof FileAudio; tone: string }
> = {
  original: { label: "Original", icon: FileAudio, tone: "bg-soft text-muted" },
  enhanced: { label: "Enhanced", icon: Sparkles, tone: "bg-soft text-ink" },
};

/**
 * One audio version row: kind, preset, created date, preview link and the
 * activation control. Server component — mutation lives in ActivateVersionButton.
 * The active version is the one currently served to listeners (mirrored onto
 * Track.audioUrl by the backend).
 */
export function VersionRow({ version }: { version: AudioVersion }) {
  const meta = KIND_META[version.kind] ?? KIND_META.original;
  const Icon = meta.icon;
  const previewUrl = `/api/tracks/${version.trackId}/versions/${version.id}/stream`;
  return (
    <div className="flex items-center gap-4 p-4">
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${meta.tone}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-ink">
            {version.label || meta.label}
          </p>
          {version.preset && (
            <span className="rounded-full bg-soft px-2 py-0.5 text-xs text-muted">
              {version.preset}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted">
          Added {version.createdAt.toLocaleDateString()}
          {version.format ? ` · ${version.format}` : ""}
          {version.bitrate ? ` · ${version.bitrate} kbps` : ""}
          {" · "}
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-sm font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            Preview
          </a>
        </p>
      </div>
      <ActivateVersionButton
        trackId={version.trackId}
        versionId={version.id}
        isActive={version.active}
      />
    </div>
  );
}
