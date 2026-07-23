import { normalizeSuggestions } from "./metadata";
import type { UploadPresetView, UploadSuggestions, UploadValuePatch } from "./types";

type PresetRow = {
  id: string;
  name: string;
  title: string | null;
  artist: string | null;
  genre: string | null;
  project: string | null;
  tags: string | null;
  license: string | null;
  description: string | null;
  price: number | null;
  releaseDate: Date | null;
  allowDownload: boolean | null;
  published: boolean | null;
};

type TrackRow = {
  id: string;
  title: string;
  artist: string;
  genre: string | null;
  album: string | null;
  tags: string | null;
  license: string | null;
  description: string | null;
  price: number | null;
  releaseDate: Date | null;
  allowDownload: boolean;
  published: boolean;
};

type SuggestionRow = Pick<TrackRow, "artist" | "genre" | "tags" | "license" | "album">;

function mapNullableValues(row: Omit<PresetRow, "id" | "name" | "project"> & { album?: string | null }) {
  const patch: UploadValuePatch = {};
  const stringFields = ["title", "artist", "genre", "tags", "license", "description"] as const;

  for (const field of stringFields) {
    const value = row[field];

    if (value !== null) {
      Object.assign(patch, { [field]: value });
    }
  }

  if (row.album !== undefined && row.album !== null) {
    patch.album = row.album;
  }

  if (row.price !== null) {
    patch.price = String(row.price);
  }

  if (row.releaseDate !== null) {
    patch.releaseDate = toLocalIsoDate(row.releaseDate);
  }

  if (row.allowDownload !== null) {
    patch.allowDownload = row.allowDownload;
  }

  if (row.published !== null) {
    patch.published = row.published;
  }

  return patch;
}

function toLocalIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Maps a database upload preset into serializable upload-only UI values. */
export function mapPreset(row: PresetRow): UploadPresetView {
  return {
    id: row.id,
    name: row.name,
    source: "saved",
    ...mapNullableValues({ ...row, album: row.project }),
  };
}

/** Maps an owned track into a previous-track preset without sensitive track data. */
export function mapPreviousTrack(row: TrackRow & Record<string, unknown>): UploadPresetView {
  return {
    id: `track:${row.id}`,
    name: row.title,
    source: "track",
    ...mapNullableValues(row),
  };
}

/** Builds small, case-insensitive suggestions from only creator-owned metadata. */
export function uploadSuggestionsFromRows(rows: SuggestionRow[]): UploadSuggestions {
  return {
    artist: normalizeSuggestions(rows.map((row) => row.artist)),
    genre: normalizeSuggestions(rows.flatMap((row) => (row.genre ? [row.genre] : []))),
    tags: normalizeSuggestions(
      rows.flatMap((row) => (row.tags ? row.tags.split(",") : [])),
    ),
    license: normalizeSuggestions(rows.flatMap((row) => (row.license ? [row.license] : []))),
    album: normalizeSuggestions(rows.flatMap((row) => (row.album ? [row.album] : []))),
  };
}
