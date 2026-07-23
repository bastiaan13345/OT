import { describe, expect, it } from "vitest";

import { mapPreset, mapPreviousTrack, uploadSuggestionsFromRows } from "./data-mappers";

describe("mapPreset", () => {
  it("serializes a saved preset with album and an ISO local date", () => {
    expect(
      mapPreset({
        id: "preset-1",
        name: "Night set",
        title: null,
        artist: "Nova Vale",
        genre: null,
        project: "After Hours",
        tags: null,
        license: null,
        description: null,
        price: 12.5,
        releaseDate: new Date(2026, 6, 23, 12),
        allowDownload: false,
        published: null,
      }),
    ).toEqual({
      id: "preset-1",
      name: "Night set",
      source: "saved",
      artist: "Nova Vale",
      album: "After Hours",
      price: "12.5",
      releaseDate: "2026-07-23",
      allowDownload: false,
    });
  });

  it("serializes preset dates by their UTC calendar date", () => {
    const preset = mapPreset({
      id: "preset-utc",
      name: "UTC date",
      title: null,
      artist: null,
      genre: null,
      project: null,
      tags: null,
      license: null,
      description: null,
      price: null,
      releaseDate: new Date("2026-07-23T23:00:00.000Z"),
      allowDownload: null,
      published: null,
    });

    expect(preset.releaseDate).toBe("2026-07-23");
  });
});

describe("mapPreviousTrack", () => {
  it("allows only upload metadata from a prior owned track", () => {
    expect(
      mapPreviousTrack({
        id: "track-1",
        title: "Signal Fire",
        artist: "Nova Vale",
        genre: "Electronic",
        album: "After Hours",
        tags: "synthwave",
        license: "All rights reserved",
        description: "Night drive",
        price: 4.5,
        releaseDate: new Date(2026, 6, 23, 12),
        allowDownload: true,
        published: false,
        audioUrl: "local:audio/private.mp3",
        coverUrl: "/uploads/covers/private.jpg",
        plays: 99,
        downloads: 4,
        creatorId: "creator-1",
      }),
    ).toEqual({
      id: "track:track-1",
      name: "Signal Fire",
      source: "track",
      title: "Signal Fire",
      artist: "Nova Vale",
      genre: "Electronic",
      album: "After Hours",
      tags: "synthwave",
      license: "All rights reserved",
      description: "Night drive",
      price: "4.5",
      releaseDate: "2026-07-23",
      allowDownload: true,
      published: false,
    });
  });
});

describe("uploadSuggestionsFromRows", () => {
  it("trims and de-duplicates current creator metadata", () => {
    expect(
      uploadSuggestionsFromRows([
        {
          artist: " Nova Vale ",
          genre: "Electronic",
          tags: "night, Synthwave",
          license: "All rights reserved",
          album: "After Hours",
        },
        {
          artist: "nova vale",
          genre: " electronic ",
          tags: "synthwave, driving",
          license: "",
          album: null,
        },
      ]),
    ).toEqual({
      artist: ["Nova Vale"],
      genre: ["Electronic"],
      tags: ["night", "Synthwave", "driving"],
      license: ["All rights reserved"],
      album: ["After Hours"],
    });
  });
});
