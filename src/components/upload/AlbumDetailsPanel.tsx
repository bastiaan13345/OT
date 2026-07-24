"use client";

import { useId, useRef, useState } from "react";
import { Image as ImageIcon, Save } from "lucide-react";
import { SwitchField } from "./SwitchField";
import { DatePicker } from "./DatePicker";
import { SuggestionField } from "./SuggestionField";
import { PresetPicker } from "./PresetPicker";
import type { UploadPresetView, UploadSuggestions, UploadValuePatch } from "@/lib/upload/types";

type AlbumDetailsPanelProps = {
  albumTitle: string;
  onAlbumTitleChange: (v: string) => void;
  albumType: string;
  onAlbumTypeChange: (v: string) => void;
  releaseDate: string;
  onReleaseDateChange: (v: string) => void;
  coverFile: File | null;
  coverPreview: string | null;
  onCoverChange: (file: File | null) => void;
  shared: UploadValuePatch;
  onSharedPatch: (patch: UploadValuePatch) => void;
  concurrency: number;
  onConcurrencyChange: (n: number) => void;
  presets: UploadPresetView[];
  suggestions: UploadSuggestions;
  allowDownload: boolean;
  published: boolean;
  featured: boolean;
  onToggle: (key: "allowDownload" | "published" | "featured") => void;
  onSavePreset: (name: string) => void;
  disabled?: boolean;
};

export function AlbumDetailsPanel(props: AlbumDetailsPanelProps) {
  const coverInputId = useId();
  const coverRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [presetName, setPresetName] = useState("");
  const disabled = props.disabled ?? false;

  const handleCover = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    props.onCoverChange(file);
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    props.onSavePreset(name);
    setPresetName("");
  };

  return (
    <div className="space-y-6 rounded-2xl border border-line bg-panel p-5">
      {/* Shared cover */}
      <div>
        <label className="mb-2 block text-sm font-medium text-ink" htmlFor={coverInputId}>
          Album cover image
        </label>
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-soft">
            {props.coverPreview ? (
              <img
                src={props.coverPreview}
                alt="Album cover preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-faint">
                <ImageIcon className="h-7 w-7" aria-hidden />
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={coverRef}
              id={coverInputId}
              type="file"
              accept="image/*"
              disabled={disabled}
              className="hidden"
              onChange={(e) => {
                handleCover(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={disabled}
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink transition hover:bg-soft upload-control-focus disabled:opacity-50"
              onClick={() => coverRef.current?.click()}
            >
              {props.coverFile ? "Change cover" : "Choose cover"}
            </button>
            {props.coverFile && (
              <button
                type="button"
                disabled={disabled}
                className="ml-2 text-sm text-muted hover:text-ink"
                onClick={() => props.onCoverChange(null)}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Album title + type */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium text-ink" htmlFor="album-title">
            Album title
          </label>
          <input
            id="album-title"
            type="text"
            value={props.albumTitle}
            disabled={disabled}
            maxLength={200}
            className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink transition upload-control-focus disabled:opacity-50"
            onChange={(e) => props.onAlbumTitleChange(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-ink" htmlFor="album-type">
            Release type
          </label>
          <select
            id="album-type"
            value={props.albumType}
            disabled={disabled}
            className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink transition upload-control-focus disabled:opacity-50"
            style={{ colorScheme: "light" }}
            onChange={(e) => props.onAlbumTypeChange(e.target.value)}
          >
            <option value="album">Album</option>
            <option value="ep">EP</option>
            <option value="single">Single</option>
          </select>
        </div>
      </div>

      {/* Release date */}
      <DatePicker
        label="Release date"
        name="releaseDate"
        value={props.releaseDate}
        onChange={props.onReleaseDateChange}
        disabled={disabled}
      />

      {/* Shared defaults */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SuggestionField
          label="Default artist"
          value={props.shared.artist ?? ""}
          suggestions={props.suggestions.artist}
          onChange={(v) => props.onSharedPatch({ artist: v })}
          disabled={disabled}
        />
        <SuggestionField
          label="Default genre"
          value={props.shared.genre ?? ""}
          suggestions={props.suggestions.genre}
          onChange={(v) => props.onSharedPatch({ genre: v })}
          disabled={disabled}
        />
        <SuggestionField
          label="Default tags"
          value={props.shared.tags ?? ""}
          suggestions={props.suggestions.tags}
          onChange={(v) => props.onSharedPatch({ tags: v })}
          disabled={disabled}
        />
        <SuggestionField
          label="Default license"
          value={props.shared.license ?? ""}
          suggestions={props.suggestions.license}
          onChange={(v) => props.onSharedPatch({ license: v })}
          disabled={disabled}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-ink" htmlFor="album-description">
          Default description
        </label>
        <textarea
          id="album-description"
          value={props.shared.description ?? ""}
          disabled={disabled}
          rows={3}
          className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink transition upload-control-focus disabled:opacity-50"
          onChange={(e) => props.onSharedPatch({ description: e.target.value })}
        />
      </div>

      {/* Presets */}
      <div className="flex flex-wrap items-end gap-4">
        <PresetPicker
          current={props.shared}
          presets={props.presets}
          onApply={props.onSharedPatch}
          disabled={disabled}
        />
        <div className="flex-1" style={{ minWidth: 200 }}>
          <label className="mb-2 block text-sm font-medium text-ink" htmlFor="preset-name">
            Save current values as preset
          </label>
          <div className="flex gap-2">
            <input
              id="preset-name"
              type="text"
              value={presetName}
              maxLength={80}
              placeholder="Preset name"
              disabled={disabled}
              className="flex-1 rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink transition upload-control-focus disabled:opacity-50"
              onChange={(e) => setPresetName(e.target.value)}
            />
            <button
              type="button"
              disabled={disabled || !presetName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-soft upload-control-focus disabled:opacity-50"
              onClick={savePreset}
            >
              <Save className="h-4 w-4" aria-hidden />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Concurrency */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-ink" htmlFor="concurrency">
          Concurrent uploads
        </label>
        <select
          id="concurrency"
          value={props.concurrency}
          disabled={disabled}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink transition upload-control-focus disabled:opacity-50"
          style={{ colorScheme: "light" }}
          onChange={(e) => props.onConcurrencyChange(Number(e.target.value))}
        >
          <option value={1}>1 (sequential)</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4 (maximum)</option>
        </select>
      </div>

      {/* Advanced toggles */}
      <div className="border-t border-line pt-4">
        <button
          type="button"
          className="text-sm font-medium text-muted hover:text-ink upload-control-focus rounded-lg"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? "Hide" : "Show"} advanced options
        </button>
        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <SwitchField
              name="allowDownload"
              label="Allow downloads"
              checked={props.allowDownload}
              onChange={() => props.onToggle("allowDownload")}
              disabled={disabled}
            />
            <SwitchField
              name="published"
              label="Publish immediately (turn off for draft)"
              checked={props.published}
              onChange={() => props.onToggle("published")}
              disabled={disabled}
            />
            <SwitchField
              name="featured"
              label="Feature on homepage (admin only)"
              checked={props.featured}
              onChange={() => props.onToggle("featured")}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  );
}
