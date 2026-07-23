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

  it("strips dot, underscore, and hyphen track number prefixes", () => {
    expect(parseAudioFilename("02 Nova Vale - Static Bloom.wav")).toEqual({
      artist: "Nova Vale",
      title: "Static Bloom",
    });
    expect(parseAudioFilename("02. Nova Vale - Static Bloom.wav")).toEqual({
      artist: "Nova Vale",
      title: "Static Bloom",
    });
    expect(parseAudioFilename("02_Nova Vale - Static Bloom.wav")).toEqual({
      artist: "Nova Vale",
      title: "Static Bloom",
    });
    expect(parseAudioFilename("02 - Nova Vale - Static Bloom.wav")).toEqual({
      artist: "Nova Vale",
      title: "Static Bloom",
    });
  });

  it("keeps later title hyphens after splitting artist and title", () => {
    expect(parseAudioFilename("Nova Vale - Static - Bloom.wav")).toEqual({
      artist: "Nova Vale",
      title: "Static - Bloom",
    });
  });

  it("returns a title without an artist when the filename has no separator", () => {
    expect(parseAudioFilename("Static_Bloom.wav")).toEqual({ title: "Static Bloom" });
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

  it("only previews string fields when replacing populated current values", () => {
    expect(previewPresetOverwrite({}, { genre: "Ambient" })).toEqual([]);
    expect(previewPresetOverwrite({ genre: "Rock" }, { genre: "Ambient" })).toEqual([
      "genre",
    ]);
    expect(previewPresetOverwrite({ genre: "Rock" }, { genre: "" })).toEqual(["genre"]);
  });

  it("previews boolean replacements and ignores undefined preset fields", () => {
    expect(previewPresetOverwrite({ allowDownload: false }, { allowDownload: true })).toEqual([
      "allowDownload",
    ]);
    expect(previewPresetOverwrite({ genre: "Rock" }, { genre: undefined })).toEqual([]);
  });

  it("preserves current values for undefined preset properties", () => {
    expect(applyPreset({ title: "Current", genre: "Rock" }, { title: undefined, genre: "Ambient" }))
      .toEqual({ title: "Current", genre: "Ambient" });
  });

  it("normalizes suggestions with case-insensitive deduplication", () => {
    expect(normalizeSuggestions([" Ambient ", "ambient", "Rock", ""])).toEqual([
      "Ambient",
      "Rock",
    ]);
  });

  it("returns no suggestions for non-positive limits and floors positive limits", () => {
    expect(normalizeSuggestions(["Ambient", "Rock"], 0)).toEqual([]);
    expect(normalizeSuggestions(["Ambient", "Rock"], -2)).toEqual([]);
    expect(normalizeSuggestions(["Ambient", "Rock", "Jazz"], 2.8)).toEqual([
      "Ambient",
      "Rock",
    ]);
  });
});
