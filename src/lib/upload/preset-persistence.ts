import { isValidIsoDate } from "./date";
import type { UploadValuePatch } from "./types";

export type PresetStorageData = {
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

function utcNoonFromIsoDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function priceFromPatch(value: string | undefined) {
  if (value === undefined || value === "") {
    return null;
  }

  const price = Number(value);

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be a non-negative number.");
  }

  return price;
}

function dateFromPatch(value: string | undefined) {
  if (value === undefined || value === "") {
    return null;
  }

  if (!isValidIsoDate(value)) {
    throw new Error("Release date must be a valid ISO date.");
  }

  return utcNoonFromIsoDate(value);
}

/**
 * Produces a complete Prisma data shape. Undefined upload fields intentionally
 * become null so an updated preset no longer applies disabled fields.
 */
export function presetStorageData(patch: UploadValuePatch): PresetStorageData {
  return {
    title: patch.title ?? null,
    artist: patch.artist ?? null,
    genre: patch.genre ?? null,
    project: patch.album ?? null,
    tags: patch.tags ?? null,
    license: patch.license ?? null,
    description: patch.description ?? null,
    price: priceFromPatch(patch.price),
    releaseDate: dateFromPatch(patch.releaseDate),
    allowDownload: patch.allowDownload ?? null,
    published: patch.published ?? null,
  };
}
