"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Music2, Upload as UploadIcon, Sparkles } from "lucide-react";
import { AudioDropzone } from "./AudioDropzone";
import { AlbumDetailsPanel } from "./AlbumDetailsPanel";
import { TrackUploadRow } from "./TrackUploadRow";
import { SwitchField } from "./SwitchField";
import { DatePicker } from "./DatePicker";
import { SuggestionField } from "./SuggestionField";
import { parseAudioFilename, resolveTrackValues } from "@/lib/upload/metadata";
import { runBounded, moveItem } from "@/lib/upload/scheduler";
import type {
  UploadRow,
  UploadRowStatus,
  UploadStudioData,
  UploadValuePatch,
} from "@/lib/upload/types";

export type UploadStudioProps = {
  initialData: UploadStudioData;
};

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function buildTrackFormData(row: UploadRow, shared: UploadValuePatch, published: boolean, allowDownload: boolean, featured: boolean): FormData {
  const resolved = resolveTrackValues(shared, row.detected, row.overrides);
  const fd = new FormData();
  fd.set("title", resolved.title?.trim() || row.file.name);
  fd.set("artist", resolved.artist?.trim() || "Untitled artist");
  fd.set("genre", resolved.genre ?? "");
  fd.set("album", resolved.album ?? "");
  fd.set("tags", resolved.tags ?? "");
  fd.set("license", resolved.license ?? "");
  fd.set("description", resolved.description ?? "");
  fd.set("price", resolved.price ?? "");
  fd.set("releaseDate", resolved.releaseDate ?? "");
  fd.set("allowDownload", allowDownload ? "on" : "off");
  fd.set("featured", featured ? "on" : "off");
  fd.set("published", published ? "published" : "draft");
  fd.set("creationKey", row.creationKey);
  fd.set("audio", row.file);
  return fd;
}

export function UploadStudio({ initialData }: UploadStudioProps) {
  const router = useRouter();

  const [mode, setMode] = useState<"single" | "album">("single");
  const [shared, setShared] = useState<UploadValuePatch>({});
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumType, setAlbumType] = useState<"single" | "ep" | "album">("album");
  const [releaseDate, setReleaseDate] = useState("");
  const [concurrency, setConcurrency] = useState(initialData.concurrency || 2);
  const [busy, setBusy] = useState(false);
  const [release, setRelease] = useState<{ releaseId: string; coverUrl: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allowDownload, setAllowDownload] = useState(false);
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [singleCoverPreview, setSingleCoverPreview] = useState<string | null>(null);
  const singleCoverRef = useRef<HTMLInputElement>(null);

  // --- Cover preview management ---
  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  // --- beforeunload while busy ---
  useEffect(() => {
    if (!busy) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy]);

  // --- Row helpers ---
  const markRow = useCallback((clientId: string, patch: Partial<UploadRow>) => {
    setRows((prev) => prev.map((row) => (row.clientId === clientId ? { ...row, ...patch } : row)));
  }, []);

  const parseMetadata = useCallback(async (clientId: string, file: File) => {
    try {
      const { parseBlob } = await import("music-metadata");
      const { common } = await parseBlob(file, { duration: false, skipCovers: false });
      setRows((prev) =>
        prev.map((row) => {
          if (row.clientId !== clientId) return row;
          const detected = { ...row.detected };
          if (common.title?.trim()) detected.title = common.title.trim();
          if (common.artist?.trim()) detected.artist = common.artist.trim();
          if (common.genre?.length) detected.genre = common.genre.filter(Boolean).join(", ");
          if (common.album?.trim()) detected.album = common.album.trim();
          if (common.year) detected.releaseDate = String(common.year);
          const picture = common.picture?.[0];
          if (picture && !coverFile) {
            const ext = picture.format.includes("png") ? "png" : picture.format.includes("webp") ? "webp" : "jpg";
            const embedded = new File([new Uint8Array(picture.data)], `embedded-cover.${ext}`, { type: picture.format });
            setCoverFile(embedded);
          }
          return { ...row, detected, status: "ready" as UploadRowStatus };
        })
      );
    } catch {
      markRow(clientId, { status: "ready" });
    }
  }, [coverFile, markRow]);

  const addFiles = useCallback((files: File[]) => {
    const newRows: UploadRow[] = files.map((file) => ({
      clientId: makeId(),
      creationKey: makeId(),
      file,
      detected: parseAudioFilename(file.name),
      overrides: {},
      status: "reading" as UploadRowStatus,
      error: null,
      trackId: null,
    }));
    setRows((prev) => (mode === "album" ? [...prev, ...newRows] : newRows));
    // Seed shared artist from first file in single mode
    if (mode === "single" && newRows[0]) {
      const d = newRows[0].detected;
      setShared((prev) => ({
        ...prev,
        title: prev.title || d.title || "",
        artist: prev.artist || d.artist || "",
      }));
    }
    for (const row of newRows) {
      void parseMetadata(row.clientId, row.file);
    }
  }, [mode, parseMetadata]);

  const onSharedPatch = useCallback((patch: UploadValuePatch) => {
    setShared((prev) => ({ ...prev, ...patch }));
  }, []);

  const onMove = useCallback((from: number, to: number) => {
    if (busy) return;
    setRows((prev) => moveItem(prev, from, to));
  }, [busy]);

  const onToggle = useCallback((key: "allowDownload" | "published" | "featured") => {
    if (key === "allowDownload") setAllowDownload((v) => !v);
    if (key === "published") setPublished((v) => !v);
    if (key === "featured") setFeatured((v) => !v);
  }, []);

  // --- single-mode cover ---
  const handleSingleCover = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (singleCoverPreview) URL.revokeObjectURL(singleCoverPreview);
    // store as first row's cover or as a separate singleCover variable
    // We'll reuse coverFile for single mode too
    setCoverFile(file);
  };

  useEffect(() => {
    return () => {
      if (singleCoverPreview) URL.revokeObjectURL(singleCoverPreview);
    };
  }, []);

  // --- Single-track submission ---
  const submitSingle = async () => {
    const row = rows[0];
    if (!row) return;
    setBusy(true);
    setError(null);
    try {
      const fd = buildTrackFormData(row, shared, published, allowDownload, featured);
      if (coverFile) fd.set("cover", coverFile);
      const response = await fetch("/api/tracks", { method: "POST", body: fd });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Upload failed.");
      }
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setBusy(false);
    }
  };

  // --- Album submission ---
  const submitAlbum = async () => {
    if (!albumTitle.trim() || rows.length === 0) return;
    setBusy(true);
    setError(null);
    setRelease(null);

    // Create release
    const releaseFd = new FormData();
    releaseFd.set("creationKey", makeId());
    releaseFd.set("title", albumTitle.trim());
    releaseFd.set("type", albumType);
    if (releaseDate) releaseFd.set("releaseDate", releaseDate);
    releaseFd.set("published", published ? "published" : "draft");
    if (shared.description) releaseFd.set("description", String(shared.description));
    if (coverFile) releaseFd.set("cover", coverFile);

    let releaseId: string;
    try {
      const response = await fetch("/api/releases", { method: "POST", body: releaseFd });
      const payload = await readJson(response);
      if (!response.ok || typeof payload.releaseId !== "string") {
        throw new Error(typeof payload.error === "string" ? payload.error : "Could not create album.");
      }
      releaseId = payload.releaseId;
      setRelease({ releaseId, coverUrl: (payload.coverUrl as string | null) ?? null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create album.");
      setBusy(false);
      return;
    }

    // Upload tracks in bounded parallel
    const uploadable = rows.filter((r) => r.status === "ready" || r.status === "failed");

    const results = await runBounded(uploadable, concurrency, async (row, index) => {
      markRow(row.clientId, { status: "uploading", error: null });
      const fd = buildTrackFormData(row, shared, published, allowDownload, featured);
      fd.set("releaseId", releaseId);
      fd.set("position", String(index));
      const response = await fetch("/api/tracks", { method: "POST", body: fd });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Upload failed.");
      }
      markRow(row.clientId, { status: "uploaded", trackId: payload.trackId as string, error: null });
      return payload;
    });

    // Mark failed rows
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const row = uploadable[index];
        markRow(row.clientId, {
          status: "failed",
          error:
            result.reason instanceof Error
              ? result.reason.message
              : "Upload failed.",
        });
      }
    });

    setBusy(false);
  };

  // --- Retry a single failed row ---
  const retryRow = async (clientId: string) => {
    if (!release) return;
    const row = rows.find((r) => r.clientId === clientId);
    if (!row) return;
    setBusy(true);
    setError(null);

    const position = rows.indexOf(row);
    markRow(clientId, { status: "uploading", error: null });

    try {
      const fd = buildTrackFormData(row, shared, published, allowDownload, featured);
      fd.set("releaseId", release.releaseId);
      fd.set("position", String(position));
      const response = await fetch("/api/tracks", { method: "POST", body: fd });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Upload failed.");
      }
      markRow(clientId, { status: "uploaded", trackId: payload.trackId as string, error: null });
    } catch (err) {
      markRow(clientId, {
        status: "failed",
        error: err instanceof Error ? err.message : "Upload failed.",
      });
    }

    setBusy(false);
  };

  // --- Save current values as preset ---
  const [presetName, setPresetName] = useState("");
  const [presetSaved, setPresetSaved] = useState<string | null>(null);

  const savePreset = async (name: string) => {
    const fd = new FormData();
    fd.set("name", name);
    for (const key of Object.keys(shared) as Array<keyof typeof shared>) {
      const value = shared[key];
      if (value !== undefined) {
        if (typeof value === "boolean") {
          fd.set(key, value ? "on" : "off");
        } else {
          fd.set(key, String(value));
        }
      }
    }
    fd.set("allowDownload", allowDownload ? "on" : "off");
    fd.set("published", published ? "on" : "off");
    try {
      const { createUploadPreset } = await import("@/lib/upload/actions");
      const result = await createUploadPreset(fd);
      if (result.ok) {
        setPresetSaved(name);
        setPresetName("");
        setTimeout(() => setPresetSaved(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preset.");
    }
  };

  // --- Derived values ---
  const uploadedCount = rows.filter((r) => r.status === "uploaded").length;
  const failedCount = rows.filter((r) => r.status === "failed").length;
  const readyCount = rows.filter((r) => r.status === "ready").length;

  // =================== RENDER ===================

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { if (!busy) { setMode("single"); setRows([]); } }}
          disabled={busy}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition upload-control-focus ${
            mode === "single"
              ? "bg-ink text-canvas"
              : "border border-line bg-canvas text-ink hover:bg-soft"
          }`}
        >
          <Music2 className="h-4 w-4" aria-hidden />
          Single track
        </button>
        <button
          type="button"
          onClick={() => { if (!busy) { setMode("album"); setRows([]); setRelease(null); } }}
          disabled={busy}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition upload-control-focus ${
            mode === "album"
              ? "bg-ink text-canvas"
              : "border border-line bg-canvas text-ink hover:bg-soft"
          }`}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Create album
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* ===== SINGLE MODE ===== */}
      {mode === "single" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-line bg-panel p-5 space-y-6">
            <AudioDropzone multiple={false} onFiles={addFiles} disabled={busy} />

            {rows.length > 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink" htmlFor="track-title">Title</label>
                    <input
                      id="track-title"
                      type="text"
                      maxLength={200}
                      value={shared.title ?? ""}
                      disabled={busy}
                      className="w-full rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm text-ink transition upload-control-focus disabled:opacity-50"
                      onChange={(e) => onSharedPatch({ title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink" htmlFor="track-artist">Artist</label>
                    <input
                      id="track-artist"
                      type="text"
                      maxLength={200}
                      value={shared.artist ?? ""}
                      disabled={busy}
                      className="w-full rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm text-ink transition upload-control-focus disabled:opacity-50"
                      onChange={(e) => onSharedPatch({ artist: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SuggestionField label="Genre" value={shared.genre ?? ""} suggestions={initialData.suggestions.genre} onChange={(v) => onSharedPatch({ genre: v })} disabled={busy} />
                  <SuggestionField label="Album" value={shared.album ?? ""} suggestions={initialData.suggestions.album} onChange={(v) => onSharedPatch({ album: v })} disabled={busy} />
                  <SuggestionField label="Tags" value={shared.tags ?? ""} suggestions={initialData.suggestions.tags} onChange={(v) => onSharedPatch({ tags: v })} disabled={busy} />
                  <SuggestionField label="License" value={shared.license ?? ""} suggestions={initialData.suggestions.license} onChange={(v) => onSharedPatch({ license: v })} disabled={busy} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink" htmlFor="track-price">Price</label>
                    <input
                      id="track-price"
                      type="text"
                      value={shared.price ?? ""}
                      disabled={busy}
                      className="w-full rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm text-ink transition upload-control-focus disabled:opacity-50"
                      onChange={(e) => onSharedPatch({ price: e.target.value })}
                    />
                  </div>
                  <DatePicker label="Release date" name="track-releaseDate" value={shared.releaseDate ?? ""} onChange={(v) => onSharedPatch({ releaseDate: v })} disabled={busy} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink" htmlFor="track-description">Description</label>
                  <textarea
                    id="track-description"
                    rows={3}
                    value={shared.description ?? ""}
                    disabled={busy}
                    className="w-full rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm text-ink transition upload-control-focus disabled:opacity-50"
                    style={{ colorScheme: "light" }}
                    onChange={(e) => onSharedPatch({ description: e.target.value })}
                  />
                </div>

                {/* Cover */}
                <div>
                  <p className="mb-2 text-sm font-medium text-ink">Cover image (optional)</p>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-soft">
                      {coverPreview ? (
                        <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-faint text-xs">No cover</div>
                      )}
                    </div>
                    <input
                      ref={singleCoverRef}
                      type="file"
                      accept="image/*"
                      disabled={busy}
                      className="hidden"
                      onChange={(e) => { handleSingleCover(e.target.files?.[0] ?? null); e.target.value = ""; }}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink transition hover:bg-soft upload-control-focus disabled:opacity-50"
                      onClick={() => singleCoverRef.current?.click()}
                    >
                      {coverFile ? "Change cover" : "Choose cover"}
                    </button>
                    {coverFile && (
                      <button type="button" disabled={busy} className="text-sm text-muted hover:text-ink" onClick={() => setCoverFile(null)}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Advanced */}
                <div className="border-t border-line pt-4">
                  <button type="button" className="text-sm font-medium text-muted hover:text-ink upload-control-focus rounded-lg" aria-expanded={showAdvanced} onClick={() => setShowAdvanced(!showAdvanced)}>
                    {showAdvanced ? "Hide" : "Show"} advanced options
                  </button>
                  {showAdvanced && (
                    <div className="mt-4 space-y-4">
                      <SwitchField name="single-allowDownload" label="Allow downloads" checked={allowDownload} onChange={() => onToggle("allowDownload")} disabled={busy} />
                      <SwitchField name="single-published" label="Publish immediately (turn off for draft)" checked={published} onChange={() => onToggle("published")} disabled={busy} />
                      <SwitchField name="single-featured" label="Feature on homepage (admin only)" checked={featured} onChange={() => onToggle("featured")} disabled={busy} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {rows.length > 0 && (
            <button
              type="button"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-6 py-3 text-sm font-medium text-canvas transition hover:opacity-80 disabled:opacity-50 upload-control-focus"
              onClick={submitSingle}
            >
              <UploadIcon className="h-4 w-4" aria-hidden />
              {busy ? "Uploading…" : "Upload track"}
            </button>
          )}
        </div>
      )}

      {/* ===== ALBUM MODE ===== */}
      {mode === "album" && (
        <div className="space-y-6">
          <AlbumDetailsPanel
            albumTitle={albumTitle}
            onAlbumTitleChange={setAlbumTitle}
            albumType={albumType}
            onAlbumTypeChange={(v) => setAlbumType(v as "single" | "ep" | "album")}
            releaseDate={releaseDate}
            onReleaseDateChange={setReleaseDate}
            coverFile={coverFile}
            coverPreview={coverPreview}
            onCoverChange={setCoverFile}
            shared={shared}
            onSharedPatch={onSharedPatch}
            concurrency={concurrency}
            onConcurrencyChange={setConcurrency}
            presets={initialData.presets}
            suggestions={initialData.suggestions}
            allowDownload={allowDownload}
            published={published}
            featured={featured}
            onToggle={onToggle}
            onSavePreset={savePreset}
            disabled={busy}
          />

          <AudioDropzone multiple onFiles={addFiles} disabled={busy} />

          {/* Track rows */}
          {rows.length > 0 && (
            <div className="space-y-3">
              {rows.map((row, index) => (
                <TrackUploadRow
                  key={row.clientId}
                  row={row}
                  index={index}
                  total={rows.length}
                  shared={shared}
                  suggestions={initialData.suggestions}
                  onUpdate={markRow}
                  onMove={onMove}
                  onRetry={retryRow}
                  disabled={busy}
                />
              ))}
            </div>
          )}

          {/* Summary + submit */}
          {rows.length > 0 && (
            <div className="flex items-center justify-between gap-4">
              {(uploadedCount > 0 || failedCount > 0) && (
                <p className="text-sm text-muted">
                  {uploadedCount} uploaded, {failedCount} failed
                  {readyCount > 0 && `, ${readyCount} pending`}
                </p>
              )}
              <button
                type="button"
                disabled={busy || !albumTitle.trim() || rows.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-ink px-6 py-3 text-sm font-medium text-canvas transition hover:opacity-80 disabled:opacity-50 upload-control-focus disabled:cursor-not-allowed"
                onClick={submitAlbum}
              >
                <UploadIcon className="h-4 w-4" aria-hidden />
                {busy ? "Uploading…" : "Create album & upload"}
              </button>
            </div>
          )}

          {failedCount > 0 && !busy && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Some tracks failed to upload. Use the Retry button on each failed row to try again.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
