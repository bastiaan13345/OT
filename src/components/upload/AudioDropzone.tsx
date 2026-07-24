"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Upload } from "lucide-react";

type AudioDropzoneProps = {
  multiple: boolean;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
};

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".oga", ".opus"];

export function AudioDropzone({ multiple, onFiles, disabled = false }: AudioDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);

  const isAudioFile = (file: File) => {
    if (file.type.startsWith("audio/")) return true;
    const ext = file.name.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? "";
    return AUDIO_EXTENSIONS.includes(`.${ext}`);
  };

  const acceptFiles = useCallback(
    (fileList: FileList | File[]) => {
      if (disabled) return;
      const files = Array.from(fileList);
      const valid = files.filter(isAudioFile);
      const invalid = files.filter((f) => !isAudioFile(f)).map((f) => f.name);
      setRejected(invalid);
      if (valid.length > 0) {
        onFiles(multiple ? valid : [valid[0]]);
      }
    },
    [disabled, multiple, onFiles],
  );

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    acceptFiles(event.dataTransfer.files);
  };

  const label = multiple ? "Add audio files" : "Add an audio file";

  return (
    <div>
      <label
        htmlFor={inputId}
        className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line px-4 py-6 text-sm transition-colors ${
          dragActive
            ? "border-brand-500 bg-soft"
            : "border-line bg-panel hover:bg-soft"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <Upload className="h-5 w-5 shrink-0 text-muted" aria-hidden />
        <span className="text-muted">
          {label}
          {multiple ? " (drag or choose multiple)" : " (drag or choose)"}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="audio/*"
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) acceptFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {rejected.length > 0 && (
        <p className="mt-2 text-xs text-muted" role="alert">
          Ignored non-audio files: {rejected.join(", ")}
        </p>
      )}
    </div>
  );
}
