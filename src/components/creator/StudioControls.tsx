"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Activity, Check, Loader2, AlertCircle } from "lucide-react";
import { analyzeTrack, enhanceTrack, activateAudioVersion } from "@/lib/actions";
import type { EnhancePreset } from "./types";

const PRESETS: { value: EnhancePreset; label: string; blurb: string }[] = [
  { value: "balanced", label: "Balanced", blurb: "Even loudness & gentle EQ" },
  { value: "warm", label: "Warm", blurb: "Rounded lows, softer highs" },
  { value: "bright", label: "Bright", blurb: "Lifted highs, added clarity" },
];

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  };
  return { pending, error, run };
}

/** Runs ffmpeg-based analysis on the track (factual metrics, no generation). */
export function AnalyzeButton({ trackId }: { trackId: string }) {
  const { pending, error, run } = useAction();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => analyzeTrack(trackId))}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Activity className="h-4 w-4" />
        )}
        {pending ? "Analyzing…" : "Run analysis"}
      </button>
      {error && <ActionError message={error} />}
    </div>
  );
}

/** Preset enhancement controls. Local automated processing, not generative AI. */
export function EnhanceControls({ trackId }: { trackId: string }) {
  const { pending, error, run } = useAction();
  const [preset, setPreset] = useState<EnhancePreset>("balanced");

  const submit = () => {
    run(() => enhanceTrack(trackId, preset));
  };

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-3">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPreset(p.value)}
            aria-pressed={preset === p.value}
            className={`rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
              preset === p.value
                ? "border-ink bg-soft"
                : "border-line bg-white hover:border-ink hover:bg-panel"
            }`}
          >
            <span className="block text-sm font-semibold text-ink">
              {p.label}
            </span>
            <span className="mt-0.5 block text-xs text-muted">{p.blurb}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4" />
        )}
        {pending ? "Processing…" : `Enhance (${preset})`}
      </button>
      {error && <ActionError message={error} />}
    </div>
  );
}

/** Sets a given version as the active/served audio for the track. */
export function ActivateVersionButton({
  trackId,
  versionId,
  isActive,
}: {
  trackId: string;
  versionId: string;
  isActive: boolean;
}) {
  const { pending, error, run } = useAction();
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900">
        <Check className="h-3.5 w-3.5" /> Active
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => activateAudioVersion(trackId, versionId))}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Set active
      </button>
      {error && <ActionError message={error} />}
    </span>
  );
}

function ActionError({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-xs text-red-800">
      <AlertCircle className="h-3.5 w-3.5" /> {message}
    </p>
  );
}
