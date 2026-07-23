import type { UploadValuePatch, UploadValues } from "./types";

const audioExtension = /\.[^.]+$/;
const trackNumberPrefix = /^\s*\d{1,3}(?:\s*[._-]\s*|\s+)/;

export function parseAudioFilename(filename: string): UploadValuePatch {
  const baseName = filename.replace(audioExtension, "").replace(trackNumberPrefix, "");
  const separator = /\s+-\s+/.exec(baseName);

  if (!separator || separator.index === undefined) {
    const title = baseName.replaceAll("_", " ").trim();

    return title ? { title } : {};
  }

  const artist = baseName
    .slice(0, separator.index)
    .replaceAll("_", " ")
    .trim();
  const title = baseName
    .slice(separator.index + separator[0].length)
    .replaceAll("_", " ")
    .trim();

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
    const presetValue = preset[key];
    const currentValue = current[key];
    const hasCurrentValue =
      typeof currentValue === "string" ? currentValue.trim().length > 0 : currentValue !== undefined;

    return presetValue !== undefined && hasCurrentValue && presetValue !== currentValue;
  });
}

export function normalizeSuggestions(values: string[], limit = 8): string[] {
  const normalizedLimit = Number.isFinite(limit) ? Math.floor(limit) : 8;

  if (normalizedLimit <= 0) {
    return [];
  }

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

    if (normalized.length === normalizedLimit) {
      break;
    }
  }

  return normalized;
}
