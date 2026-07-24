import {
  Activity,
  Info,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Waves,
} from "lucide-react";
import type { AudioAnalysis, AnalysisSuggestion } from "./types";

function fmt(n: number | null, unit: string, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}${unit}`;
}

const SEVERITY_TONE: Record<string, string> = {
  critical: "text-red-700",
  warning: "text-amber-700",
  info: "text-muted",
};

/**
 * Renders factual ffmpeg/ffprobe-derived analysis metrics and suggestions.
 * All values come straight from measured audio; nothing is inferred or faked.
 * Shows an honest empty state when analysis has not been run yet.
 */
export function AnalysisPanel({ analysis }: { analysis: AudioAnalysis | null }) {
  if (!analysis) {
    return (
      <div className="rounded-xl border border-line bg-panel p-6">
        <div className="flex items-center gap-2 text-muted">
          <Activity className="h-4 w-4" />
          <h2 className="text-sm font-semibold text-ink">Audio analysis</h2>
        </div>
        <p className="mt-3 text-sm text-muted">
          No analysis yet. Run analysis to measure loudness, peaks, clipping and
          format details with ffmpeg.
        </p>
      </div>
    );
  }

  const clipping =
    analysis.clippingPct != null && analysis.clippingPct > 0.01;

  const metrics: { label: string; value: string; hint?: string }[] = [
    { label: "Integrated loudness", value: fmt(analysis.loudnessLufs, " LUFS"), hint: "Streaming target ≈ −14 LUFS" },
    { label: "Loudness range", value: fmt(analysis.loudnessRange, " LU") },
    { label: "True peak", value: fmt(analysis.truePeakDb, " dBTP"), hint: "Keep ≤ −1 dBTP" },
    { label: "Sample peak", value: fmt(analysis.peakDb, " dBFS") },
    { label: "Clipping", value: analysis.clippingPct != null ? fmt(analysis.clippingPct, " %", 2) : "—" },
    { label: "Silence", value: analysis.silencePct != null ? fmt(analysis.silencePct, " %", 1) : "—" },
    { label: "Duration", value: analysis.durationSec != null ? fmt(analysis.durationSec, " s", 0) : "—" },
    { label: "Sample rate", value: analysis.sampleRate ? `${(analysis.sampleRate / 1000).toFixed(1)} kHz` : "—" },
    { label: "Channels", value: analysis.channels != null ? String(analysis.channels) : "—" },
    { label: "Bitrate", value: analysis.bitrate ? `${analysis.bitrate} kbps` : "—" },
    { label: "Codec", value: analysis.codec ?? "—" },
  ];

  return (
    <div className="rounded-xl border border-line bg-panel p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-ink" />
          <h2 className="text-sm font-semibold text-ink">Audio analysis</h2>
        </div>
        {clipping ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5" /> Clipping detected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
            <CheckCircle2 className="h-3.5 w-3.5" /> No clipping
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-line bg-white p-3">
            <dt className="text-xs text-muted">{m.label}</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-ink">{m.value}</dd>
            {m.hint && <p className="mt-0.5 text-[10px] text-muted">{m.hint}</p>}
          </div>
        ))}
      </dl>

      {analysis.suggestions.length > 0 && (
        <div className="mt-4 rounded-lg border border-line bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink">
            <Info className="h-3.5 w-3.5 text-muted" /> Suggestions
          </div>
          <ul className="space-y-2">
            {analysis.suggestions.map((s: AnalysisSuggestion) => (
              <li key={s.id} className="flex items-start gap-2 text-sm">
                <Waves
                  className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${
                    SEVERITY_TONE[s.severity] ?? "text-muted"
                  }`}
                />
                <div>
                  <p className="text-ink">{s.message}</p>
                  {s.fix && <p className="mt-0.5 text-xs text-muted">{s.fix}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted">
        Measured locally with {analysis.provider === "local" ? "ffmpeg/ffprobe" : analysis.provider} on{" "}
        {analysis.createdAt.toLocaleString()}. Metrics are factual readings of your audio file.
      </p>
    </div>
  );
}
