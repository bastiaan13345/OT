import { describe, expect, it } from "vitest";

import { normalizePresetName, parseUploadConcurrency, presetPatchFromFormData } from "./preferences";

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

describe("presetPatchFromFormData", () => {
  it("maps enabled artist and download fields only", () => {
    const formData = new FormData();
    formData.set("artist", " Nova Vale ");
    formData.set("allowDownload", "on");

    expect(presetPatchFromFormData(formData)).toEqual({
      artist: "Nova Vale",
      allowDownload: true,
    });
  });

  it("keeps omitted fields absent while preserving an explicit empty enabled value", () => {
    const formData = new FormData();
    formData.set("title", "");

    expect(presetPatchFromFormData(formData)).toEqual({ title: "" });
  });

  it("keeps a non-negative price as the client string and parses optional booleans only when present", () => {
    const formData = new FormData();
    formData.set("price", " 12.50 ");
    formData.set("published", "off");

    expect(presetPatchFromFormData(formData)).toEqual({
      price: "12.50",
      published: false,
    });
  });

  it("rejects a negative price", () => {
    const formData = new FormData();
    formData.set("price", "-0.01");

    expect(() => presetPatchFromFormData(formData)).toThrow("Price must be a non-negative number.");
  });

  it("rejects values beyond the documented field bounds", () => {
    const formData = new FormData();
    formData.set("artist", "a".repeat(201));

    expect(() => presetPatchFromFormData(formData)).toThrow("Artist must be 200 characters or fewer.");
  });

  it("rejects uploaded files for preset fields", () => {
    const formData = new FormData();
    formData.set("description", new File(["not metadata"], "notes.txt", { type: "text/plain" }));

    expect(() => presetPatchFromFormData(formData)).toThrow("Preset fields must be text values.");
  });
});
