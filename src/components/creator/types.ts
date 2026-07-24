import type { Track } from "@prisma/client";

// UI-facing types for the Creator Studio, Releases and Analytics surfaces.
// These mirror the on-disk Prisma schema (AudioVersion, AudioAnalysis,
// ProcessingJob, Release, ReleaseTrack, PlaybackEvent). Normalizers in data.ts
// map raw rows into these shapes (e.g. parsing the JSON suggestions blob).

export type AudioVersionKind = "original" | "enhanced";
export type EnhancePreset = "balanced" | "warm" | "bright";
export type ProcessingStatus = "pending" | "running" | "completed" | "failed";
export type ReleaseType = "single" | "ep" | "album";

export interface AudioVersion {
  id: string;
  trackId: string;
  kind: AudioVersionKind;
  label: string | null;
  preset: string | null;
  format: string | null;
  bitrate: number | null;
  duration: number | null;
  active: boolean;
  createdAt: Date;
}

export interface AnalysisSuggestion {
  id: string;
  severity: "info" | "warning" | "critical" | string;
  message: string;
  fix: string | null;
}

export interface AudioAnalysis {
  id: string;
  trackId: string;
  audioVersionId: string | null;
  durationSec: number | null;
  codec: string | null;
  sampleRate: number | null;
  channels: number | null;
  bitrate: number | null;
  loudnessLufs: number | null;
  loudnessRange: number | null;
  truePeakDb: number | null;
  peakDb: number | null;
  clippingPct: number | null;
  silencePct: number | null;
  suggestions: AnalysisSuggestion[];
  provider: string;
  createdAt: Date;
}

export interface ProcessingJob {
  id: string;
  trackId: string;
  type: string;
  status: ProcessingStatus;
  preset: string | null;
  progress: number;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudioTrack {
  track: Track;
  versions: AudioVersion[];
  analysis: AudioAnalysis | null;
  jobs: ProcessingJob[];
}

export interface ReleaseTrackEntry {
  id: string;
  position: number;
  trackId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  duration: number | null;
}

export interface Release {
  id: string;
  title: string;
  type: ReleaseType;
  description: string | null;
  coverUrl: string | null;
  releaseDate: Date | null;
  published: boolean;
  createdAt: Date;
  tracks: ReleaseTrackEntry[];
}

export interface TrackAnalyticsRow {
  id: string;
  title: string;
  coverUrl: string | null;
  plays: number;
  qualifiedPlays: number;
  likes: number;
  comments: number;
  downloads: number;
}

export interface TrendPoint {
  date: string;
  plays: number;
  seconds: number;
}

export interface AnalyticsSummary {
  hasEvents: boolean;
  trackCount: number;
  totalPlays: number;
  uniqueListeners: number;
  qualifiedPlays: number;
  avgListenedSeconds: number;
  completionRate: number;
  totalDownloads: number;
  totalLikes: number;
  totalComments: number;
  topTracks: TrackAnalyticsRow[];
  trend: TrendPoint[];
}
