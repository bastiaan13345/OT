import { describe, expect, it } from "vitest";

import { normalizePresetName, parseUploadConcurrency } from "./preferences";

describe("parseUploadConcurrency", () => {
  it.each([
    ["1", 1],
    ["4", 4],
  ])("accepts %s as %i concurrent uploads", (value, expected) => {
    expect(parseUploadConcurrency(value)).toBe(expected);
  });

  it("rejects a value above four", () => {
    expect(() => parseUploadConcurrency("5")).toThrow("between 1 and 4");
  });

  it.each([
    "0",
    "1.5",
    "not-a-number",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])(
    "rejects invalid concurrency value %s",
    (value) => {
      expect(() => parseUploadConcurrency(value)).toThrow("between 1 and 4");
    },
  );
});

describe("normalizePresetName", () => {
  it("trims and normalizes a preset name", () => {
    expect(normalizePresetName("  Late Night  ")).toEqual({
      name: "Late Night",
      normalizedName: "late night",
    });
  });

  it("collapses internal whitespace", () => {
    expect(normalizePresetName("Late\n\t  Night")).toEqual({
      name: "Late Night",
      normalizedName: "late night",
    });
  });

  it.each(["   ", "x".repeat(81)])("rejects an invalid preset name", (value) => {
    expect(() => normalizePresetName(value)).toThrow("between 1 and 80");
  });
});
