import { describe, expect, it } from "vitest";

import { presetStorageData } from "./preset-persistence";

describe("presetStorageData", () => {
  it("maps upload values to preset columns and clears disabled fields", () => {
    expect(
      presetStorageData({ artist: "Nova Vale", album: "After Hours", allowDownload: false }),
    ).toEqual({
      title: null,
      artist: "Nova Vale",
      genre: null,
      project: "After Hours",
      tags: null,
      license: null,
      description: null,
      price: null,
      releaseDate: null,
      allowDownload: false,
      published: null,
    });
  });

  it("keeps explicit empty strings and maps dates at UTC noon", () => {
    const data = presetStorageData({ title: "", price: "12.50", releaseDate: "2026-07-23" });

    expect(data).toMatchObject({ title: "", price: 12.5 });
    expect(data.releaseDate).toEqual(new Date("2026-07-23T12:00:00.000Z"));
  });

  it("rejects invalid ISO dates", () => {
    expect(() => presetStorageData({ releaseDate: "2026-02-30" })).toThrow(
      "Release date must be a valid ISO date.",
    );
  });
});
