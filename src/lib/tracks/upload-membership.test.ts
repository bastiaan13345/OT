import { describe, expect, it } from "vitest";
import { parseAlbumMembership } from "./upload-membership";

describe("parseAlbumMembership", () => {
  it("parses release membership with a zero-based position", () => {
    const data = new FormData();
    data.set("releaseId", "release-1");
    data.set("position", "0");
    data.set("creationKey", "track-1");
    expect(parseAlbumMembership(data)).toEqual({
      releaseId: "release-1",
      position: 0,
      creationKey: "track-1",
    });
  });

  it("parses a higher position for ordering", () => {
    const data = new FormData();
    data.set("releaseId", "r2");
    data.set("position", "5");
    data.set("creationKey", "k5");
    expect(parseAlbumMembership(data)).toEqual({
      releaseId: "r2",
      position: 5,
      creationKey: "k5",
    });
  });

  it("returns null when no releaseId is present (single-track upload)", () => {
    const data = new FormData();
    data.set("creationKey", "track-1");
    data.set("position", "0");
    expect(parseAlbumMembership(data)).toBeNull();
  });

  it("rejects album membership without an idempotency key", () => {
    const data = new FormData();
    data.set("releaseId", "release-1");
    expect(() => parseAlbumMembership(data)).toThrow("creation key");
  });

  it("rejects a negative position", () => {
    const data = new FormData();
    data.set("releaseId", "release-1");
    data.set("position", "-1");
    data.set("creationKey", "track-1");
    expect(() => parseAlbumMembership(data)).toThrow("non-negative");
  });

  it("rejects a fractional position", () => {
    const data = new FormData();
    data.set("releaseId", "release-1");
    data.set("position", "1.5");
    data.set("creationKey", "track-1");
    expect(() => parseAlbumMembership(data)).toThrow("non-negative");
  });
});
