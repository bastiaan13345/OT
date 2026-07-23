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
