import { describe, expect, it } from "vitest";

import { shouldDeleteSharedCover } from "./cover";

describe("shouldDeleteSharedCover", () => {
  it("deletes an unshared public cover after its release is gone", () => {
    expect(shouldDeleteSharedCover("/uploads/covers/release.jpg", 0, 0)).toBe(true);
    expect(shouldDeleteSharedCover("/api/media/covers/release.jpg", 0, 0)).toBe(true);
  });

  it("keeps cover artwork still referenced by another release or track", () => {
    expect(shouldDeleteSharedCover("/uploads/covers/release.jpg", 1, 0)).toBe(false);
    expect(shouldDeleteSharedCover("/uploads/covers/release.jpg", 0, 1)).toBe(false);
  });

  it("never deletes a non-cover locator", () => {
    expect(shouldDeleteSharedCover("local:audio/master.mp3", 0, 0)).toBe(false);
    expect(shouldDeleteSharedCover(null, 0, 0)).toBe(false);
  });
});
