import type { UploadValuePatch, UploadValues } from "./types";

const audioExtension = /\.[^.]+$/;
const trackNumberPrefix = /^\s*\d+\s*-\s*/;

export function parseAudioFilename(filename: string): UploadValuePatch {
  const baseName = filename.replace(audioExtension, "").replace(trackNumberPrefix, "");
  const parts = baseName.split(" - ");
  const title = parts.pop()?.replaceAll("_", " ").trim();
  const artist = parts.join(" - ").replaceAll("_", " ").trim();

  return {
    ...(artist ? { artist } : {}),
    ...(title ? { title } : {}),
  };
}

export function resolveTrackValues(
  shared: UploadValuePatch,
  detected: UploadValuePatch,
  overrides: UploadValuePatch,
): UploadValuePatch {
  return { ...shared, ...detected, ...overrides };
}

export function applyPreset(
  current: UploadValuePatch,
  preset: UploadValuePatch,
): UploadValuePatch {
  return Object.entries(preset).reduce<UploadValuePatch>(
    (values, [key, value]) =>
      value === undefined
        ? values
        : { ...values, [key as keyof UploadValues]: value },
    { ...current },
  );
}

export function previewPresetOverwrite(
  current: UploadValuePatch,
  preset: UploadValuePatch,
): Array<keyof UploadValues> {
  return (Object.keys(preset) as Array<keyof UploadValues>).filter((key) => {
    const value = preset[key];
    const isNonempty = typeof value === "string" ? value.trim().length > 0 : value !== undefined;

    return isNonempty && value !== current[key];
  });
}

export function normalizeSuggestions(values: string[], limit = 8): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const suggestion = value.trim();
    const key = suggestion.toLocaleLowerCase();

    if (!suggestion || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(suggestion);

    if (normalized.length === limit) {
      break;
    }
  }

  return normalized;
}
