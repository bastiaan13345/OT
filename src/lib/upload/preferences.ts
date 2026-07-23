import type { UploadValuePatch, UploadValues } from "./types";

export function parseUploadConcurrency(value: FormDataEntryValue | number): number {
  const concurrency = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;

  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) {
    throw new Error("Upload concurrency must be an integer between 1 and 4.");
  }

  return concurrency;
}

export function normalizePresetName(raw: string) {
  const name = raw.trim().replace(/\s+/g, " ");

  if (name.length < 1 || name.length > 80) {
    throw new Error("Preset name must be between 1 and 80 characters.");
  }

  return {
    name,
    normalizedName: name.toLowerCase(),
  };
}

/**
 * Extracts only explicitly submitted upload values for a named preset.
 * Missing entries stay absent so callers can distinguish disabled fields from
 * intentionally cleared string values.
 */
export function presetPatchFromFormData(formData: FormData): UploadValuePatch {
  const patch: UploadValuePatch = {};

  for (const field of presetStringFields) {
    const values = formData.getAll(field);

    if (values.length === 0) {
      continue;
    }

    if (values.length !== 1 || typeof values[0] !== "string") {
      throw new Error("Preset fields must be text values.");
    }

    const value = values[0];

    const trimmed = value.trim();

    if (trimmed.length > presetStringLimits[field]) {
      throw new Error(`${fieldLabel(field)} must be ${presetStringLimits[field]} characters or fewer.`);
    }

    if (field === "price" && trimmed) {
      const price = Number(trimmed);

      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Price must be a non-negative number.");
      }
    }

    Object.assign(patch, { [field]: trimmed });
  }

  for (const field of presetBooleanFields) {
    const values = formData.getAll(field);

    if (values.length === 0) {
      continue;
    }

    if (values.length !== 1 || typeof values[0] !== "string") {
      throw new Error("Preset fields must be text values.");
    }

    const value = values[0];

    if (value === "on" || value === "true") {
      Object.assign(patch, { [field]: true });
      continue;
    }

    if (value === "off" || value === "false") {
      Object.assign(patch, { [field]: false });
      continue;
    }

    throw new Error(`Invalid ${field} value.`);
  }

  return patch;
}

const presetStringFields = [
  "title",
  "artist",
  "genre",
  "album",
  "tags",
  "license",
  "description",
  "price",
  "releaseDate",
] as const satisfies ReadonlyArray<Exclude<keyof UploadValues, "allowDownload" | "published">>;

const presetBooleanFields = ["allowDownload", "published"] as const satisfies ReadonlyArray<
  Extract<keyof UploadValues, "allowDownload" | "published">
>;

const presetStringLimits: Record<(typeof presetStringFields)[number], number> = {
  title: 200,
  artist: 200,
  genre: 100,
  album: 100,
  tags: 500,
  license: 100,
  description: 5000,
  price: 100,
  releaseDate: 10,
};

function fieldLabel(field: string) {
  return field === "releaseDate"
    ? "Release date"
    : field === "allowDownload"
      ? "Allow downloads"
      : field.charAt(0).toUpperCase() + field.slice(1);
}
