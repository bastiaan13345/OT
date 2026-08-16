"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RefreshCw } from "lucide-react";
import { formatDuration } from "@/lib/utils";

export interface CompareSource {
  id: string;
  label: string;
  audioUrl: string;
}

/**
 * A/B comparison player. Loads two audio sources and lets the creator flip
 * between them while keeping playback position, so tonal/loudness differences
 * are audible without re-seeking. Purely client-side; no data mutation.
 */
export function ABComparePlayer({
  a,
  b,
}: {
  a: CompareSource;
  b: CompareSource;
}) {
  const aRef = useRef<HTMLAudioElement>(null);
  const bRef = useRef<HTMLAudioElement>(null);
  const [active, setActive] = useState<"a" | "b">("a");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const activeRef = () => (active === "a" ? aRef.current : bRef.current);
  const idleRef = () => (active === "a" ? bRef.current : aRef.current);

  useEffect(() => {
    const el = active === "a" ? aRef.current : bRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onEnded = () => setIsPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnded);
    };
  }, [active]);

  const togglePlay = () => {
    const el = activeRef();
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play();
      setIsPlaying(true);
    }
  };

  const swap = (next: "a" | "b") => {
    if (next === active) return;
    const from = activeRef();
    const to = next === "a" ? aRef.current : bRef.current;
    const t = from?.currentTime ?? 0;
    const wasPlaying = isPlaying;
    if (from) from.pause();
    setActive(next);
    if (to) {
      to.currentTime = t;
      if (wasPlaying) to.play();
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    const el = activeRef();
    if (el) el.currentTime = t;
    const other = idleRef();
    if (other) other.currentTime = t; // keep sources aligned for instant flip
  };

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <audio ref={aRef} src={a.audioUrl} preload="metadata" />
      <audio ref={bRef} src={b.audioUrl} preload="metadata" />

      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          A/B compare
        </span>
        <RefreshCw className="h-3.5 w-3.5 text-faint" />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {(["a", "b"] as const).map((slot) => {
          const src = slot === "a" ? a : b;
          const isActive = active === slot;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => swap(slot)}
              aria-pressed={isActive}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
                isActive
                  ? "border-ink bg-ink text-canvas"
                  : "border-line bg-canvas text-muted hover:border-ink hover:text-ink"
              }`}
            >
              {src.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ink text-canvas transition-transform hover:scale-105 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          )}
        </button>
        <span className="w-10 text-right text-xs text-muted">
          {formatDuration(Math.floor(currentTime))}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={seek}
          aria-label="Seek"
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink"
          style={{
            background: `linear-gradient(to right, rgb(16,16,16) ${pct}%, rgb(222,222,222) ${pct}%)`,
          }}
        />
        <span className="w-10 text-xs text-muted">
          {formatDuration(Math.floor(duration))}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted">
        Playing <span className="text-ink">{active === "a" ? a.label : b.label}</span>.
        Switch buttons to compare at the same position.
      </p>
    </div>
  );
}
