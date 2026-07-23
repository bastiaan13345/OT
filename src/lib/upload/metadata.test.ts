import { describe, expect, it } from "vitest";

import {
  applyPreset,
  normalizeSuggestions,
  parseAudioFilename,
  previewPresetOverwrite,
  resolveTrackValues,
} from "./metadata";

describe("upload metadata helpers", () => {
  it("parses a track number, artist, and title from an audio filename", () => {
    expect(parseAudioFilename("02 - Nova Vale - Static_Bloom.wav")).toEqual({
      artist: "Nova Vale",
      title: "Static Bloom",
    });
  });

  it("resolves shared, detected, and overridden track values by precedence", () => {
    expect(
      resolveTrackValues(
        { artist: "Shared", genre: "Electronic" },
        { artist: "Tagged", title: "Tagged title" },
        { title: "Renamed" },
      ),
    ).toMatchObject({
      artist: "Tagged",
      genre: "Electronic",
      title: "Renamed",
    });
  });

  it("previews and applies changed preset values", () => {
    const current = { title: "Current", genre: "Rock", allowDownload: false };
    const preset = { title: "Previous", genre: "Ambient", allowDownload: true };

    expect(previewPresetOverwrite(current, preset)).toEqual([
      "title",
      "genre",
      "allowDownload",
    ]);
    expect(applyPreset(current, preset)).toMatchObject(preset);
  });

  it("normalizes suggestions with case-insensitive deduplication", () => {
    expect(normalizeSuggestions([" Ambient ", "ambient", "Rock", ""])).toEqual([
      "Ambient",
      "Rock",
    ]);
  });
});
