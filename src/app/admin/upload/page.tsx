"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Music2, Image as ImageIcon, X, CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { uploadTrack } from "@/lib/actions";

export default function AdminUploadPage() {
  const router = useRouter();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleAudioChange = (file: File | null) => {
    if (file && file.type.startsWith("audio/")) {
      setAudioFile(file);
    }
  };

  const handleCoverChange = (file: File | null) => {
    if (file && file.type.startsWith("image/")) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const audio = files.find((f) => f.type.startsWith("audio/"));
    const image = files.find((f) => f.type.startsWith("image/"));

    if (audio) handleAudioChange(audio);
    if (image) handleCoverChange(image);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    if (audioFile) formData.set("audio", audioFile);
    if (coverFile) formData.set("cover", coverFile);

    try {
      await uploadTrack(formData);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload failed");
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Upload Track</h1>
        <p className="mt-1 text-zinc-500">Share your music with the world</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Audio Upload */}
        <div>
          <label className="mb-3 block text-sm font-semibold text-white">
            Audio File <span className="text-red-400">*</span>
          </label>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-xl border-2 border-dashed transition-all ${
              dragActive
                ? "border-brand-500 bg-brand-500/5"
                : "border-white/10 bg-surface-800"
            }`}
          >
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => handleAudioChange(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              required
            />

            {audioFile ? (
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-500/20">
                    <Music2 className="h-6 w-6 text-brand-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{audioFile.name}</p>
                    <p className="text-sm text-zinc-500">
                      {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setAudioFile(null);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10">
                  <Upload className="h-6 w-6 text-brand-400" />
                </div>
                <p className="text-sm font-medium text-white mb-1">
                  Drop audio file here, or click to browse
                </p>
                <p className="text-xs text-zinc-500">MP3, WAV, FLAC supported (max 50MB)</p>
              </div>
            )}
          </div>
        </div>

        {/* Cover Upload */}
        <div>
          <label className="mb-3 block text-sm font-semibold text-white">
            Cover Image <span className="text-zinc-500">(optional)</span>
          </label>

          <div className="flex gap-4">
            {coverPreview && (
              <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-lg">
                <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview(null);
                  }}
                  className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="relative flex-1 rounded-xl border-2 border-dashed border-white/10 bg-surface-800">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleCoverChange(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                  <ImageIcon className="h-5 w-5 text-zinc-500" />
                </div>
                <p className="text-sm text-zinc-400">Click to upload cover</p>
                <p className="text-xs text-zinc-600 mt-1">JPG, PNG (square recommended)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Track Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">
              Title <span className="text-red-400">*</span>
            </label>
            <Input name="title" placeholder="Track title" required />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white">
              Artist <span className="text-red-400">*</span>
            </label>
            <Input name="artist" placeholder="Your name" required />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-white">Genre</label>
          <Input name="genre" placeholder="e.g., Electronic, Hip Hop, Rock" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">Album or project</label>
            <Input name="album" placeholder="Single, EP, album name" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">Release date</label>
            <Input name="releaseDate" type="date" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">License</label>
            <select
              name="license"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
            >
              <option value="">Standard streaming</option>
              <option value="All rights reserved">All rights reserved</option>
              <option value="Creative Commons">Creative Commons</option>
              <option value="Royalty-free beat lease">Royalty-free beat lease</option>
              <option value="Exclusive license available">Exclusive license available</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">Price</label>
            <Input name="price" type="number" step="0.01" min="0" placeholder="0.00" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-white">Tags</label>
          <Input name="tags" placeholder="mood, instrument, tempo, collaboration tags" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-white">Description</label>
          <textarea
            name="description"
            placeholder="Tell us about this track..."
            rows={4}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors resize-none"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            { id: "allowDownload", label: "Allow downloads" },
            { id: "featured", label: "Request featured placement" },
          ].map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={item.id}
                name={item.id}
                className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-600 focus:ring-2 focus:ring-brand-500/20"
              />
              <label htmlFor={item.id} className="text-sm text-zinc-300">
                {item.label}
              </label>
            </div>
          ))}
          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="published"
              value="draft"
              className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-600 focus:ring-2 focus:ring-brand-500/20"
            />
            Save as draft
          </label>
        </div>

        <div className="h-px bg-white/5" />

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={uploading || !audioFile}
            className="flex-1"
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload Track
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => router.push("/admin")}
            disabled={uploading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
