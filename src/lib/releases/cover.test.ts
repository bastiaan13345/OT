import { describe, expect, it } from "vitest";

import { shouldDeleteReleaseCover } from "./cover";

describe("shouldDeleteReleaseCover", () => {
  it("deletes an unshared public cover after its release is gone", () => {
    expect(shouldDeleteReleaseCover("/uploads/covers/release.jpg", 0, 0)).toBe(true);
  });

  it("keeps cover artwork still referenced by another release or track", () => {
    expect(shouldDeleteReleaseCover("/uploads/covers/release.jpg", 1, 0)).toBe(false);
    expect(shouldDeleteReleaseCover("/uploads/covers/release.jpg", 0, 1)).toBe(false);
  });

  it("never deletes a non-cover locator", () => {
    expect(shouldDeleteReleaseCover("local:audio/master.mp3", 0, 0)).toBe(false);
    expect(shouldDeleteReleaseCover(null, 0, 0)).toBe(false);
  });
});
