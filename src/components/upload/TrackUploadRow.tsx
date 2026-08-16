"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, AlertCircle, RefreshCw } from "lucide-react";
import { resolveTrackValues } from "@/lib/upload/metadata";
import { SuggestionField } from "./SuggestionField";
import type { UploadRow, UploadValuePatch, UploadSuggestions } from "@/lib/upload/types";

type TrackUploadRowProps = {
  row: UploadRow;
  index: number;
  total: number;
  shared: UploadValuePatch;
  suggestions: UploadSuggestions;
  onUpdate: (clientId: string, patch: Partial<UploadRow>) => void;
  onMove: (from: number, to: number) => void;
  onRetry: (clientId: string) => void;
  disabled?: boolean;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_LABEL: Record<UploadRow["status"], string> = {
  reading: "Reading tags…",
  ready: "",
  uploading: "Uploading…",
  uploaded: "Uploaded",
  failed: "Failed",
};

export function TrackUploadRow(props: TrackUploadRowProps) {
  const { row, index, total, shared, suggestions, onUpdate, onMove, onRetry } = props;
  const disabled = props.disabled ?? false;
  const [showCustomize, setShowCustomize] = useState(false);
  const resolved = resolveTrackValues(shared, row.detected, row.overrides);
  const canMoveUp = index > 0 && !disabled;
  const canMoveDown = index < total - 1 && !disabled;

  const updateHeaderPatch = (patch: UploadValuePatch) => {
    onUpdate(row.clientId, {
      overrides: { ...row.overrides, ...patch },
    });
  };

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-start gap-3">
        {/* Reorder controls */}
        <div className="flex flex-col gap-1 pt-1">
          <button
            type="button"
            aria-label={`Move "${resolved.title || row.file.name}" up`}
            disabled={!canMoveUp}
            className="upload-control-focus rounded-md p-1 text-muted transition hover:bg-soft hover:text-ink disabled:opacity-30"
            onClick={() => onMove(index, index - 1)}
          >
            <ChevronUp className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Move "${resolved.title || row.file.name}" down`}
            disabled={!canMoveDown}
            className="upload-control-focus rounded-md p-1 text-muted transition hover:bg-soft hover:text-ink disabled:opacity-30"
            onClick={() => onMove(index, index + 1)}
          >
            <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Track number + filename */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-faint">{String(index + 1).padStart(2, "0")}</span>
            <span className="truncate text-sm text-muted">{row.file.name}</span>
            <span className="shrink-0 text-xs text-faint">{formatSize(row.file.size)}</span>
          </div>

          {/* Title input — the rename field */}
          <input
            type="text"
            value={resolved.title ?? ""}
            disabled={disabled || row.status === "uploaded"}
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink transition upload-control-focus disabled:opacity-50"
            onChange={(e) => updateHeaderPatch({ title: e.target.value })}
          />

          {/* Status / error */}
          {row.status === "failed" && row.error ? (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{row.error}</span>
            </div>
          ) : row.status === "uploaded" ? (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-medium text-green-600">{STATUS_LABEL.uploaded}</span>
              {row.trackId && (
                <a
                  href={`/track/${row.trackId}`}
                  className="text-sm text-muted hover:text-ink"
                >
                  View track
                </a>
              )}
            </div>
          ) : row.status !== "ready" && row.status !== "reading" ? (
            <span className="mt-2 block text-sm text-muted">{STATUS_LABEL[row.status]}</span>
          ) : null}

          {/* Phase indicator for reading */}
          {row.status === "reading" && (
            <span className="mt-2 block text-xs text-faint">{STATUS_LABEL.reading}</span>
          )}

          {/* Customize disclosure */}
          {row.status !== "uploaded" && (
            <button
              type="button"
              className="mt-2 text-xs text-muted hover:text-ink upload-control-focus rounded-md"
              aria-expanded={showCustomize}
              onClick={() => setShowCustomize(!showCustomize)}
            >
              {showCustomize ? "Hide" : "Customize"} per-track details
            </button>
          )}

          {showCustomize && row.status !== "uploaded" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <SuggestionField
                label="Track artist"
                value={resolved.artist ?? ""}
                suggestions={suggestions.artist}
                disabled={disabled}
                onChange={(v) => updateHeaderPatch({ artist: v })}
              />
              <SuggestionField
                label="Track genre"
                value={resolved.genre ?? ""}
                suggestions={suggestions.genre}
                disabled={disabled}
                onChange={(v) => updateHeaderPatch({ genre: v })}
              />
              <SuggestionField
                label="Track tags"
                value={resolved.tags ?? ""}
                suggestions={suggestions.tags}
                disabled={disabled}
                onChange={(v) => updateHeaderPatch({ tags: v })}
              />
              <SuggestionField
                label="Track license"
                value={resolved.license ?? ""}
                suggestions={suggestions.license}
                disabled={disabled}
                onChange={(v) => updateHeaderPatch({ license: v })}
              />
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-ink">
                  Track description
                </label>
                <textarea
                  value={resolved.description ?? ""}
                  disabled={disabled}
                  rows={2}
                  className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink transition upload-control-focus disabled:opacity-50"
                  onChange={(e) => updateHeaderPatch({ description: e.target.value })}
                  style={{ colorScheme: "light" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Retry button */}
        {row.status === "failed" && (
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink transition hover:bg-soft upload-control-focus"
            onClick={() => onRetry(row.clientId)}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
