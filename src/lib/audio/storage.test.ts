import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rm } from "fs/promises";
import { join, resolve } from "path";
import {
  ensureUploadDir,
  mediaRoot,
  publicUrl,
  resolvePublicPath,
} from "./storage";

const originalMediaRoot = process.env.MEDIA_ROOT;

describe("persistent media storage", () => {
  beforeEach(() => {
    process.env.MEDIA_ROOT = join(process.cwd(), ".storage-test");
  });

  afterEach(async () => {
    await rm(join(process.cwd(), ".storage-test"), { recursive: true, force: true });
    if (originalMediaRoot === undefined) delete process.env.MEDIA_ROOT;
    else process.env.MEDIA_ROOT = originalMediaRoot;
  });

  it("places every mutable media type beneath MEDIA_ROOT", async () => {
    expect(mediaRoot()).toBe(resolve(process.env.MEDIA_ROOT!));
    await expect(ensureUploadDir("audio")).resolves.toBe(join(mediaRoot(), "audio"));
    await expect(ensureUploadDir("enhanced")).resolves.toBe(join(mediaRoot(), "enhanced"));
    await expect(ensureUploadDir("covers")).resolves.toBe(join(mediaRoot(), "covers"));
  });

  it("generates private audio locators and routed cover URLs", () => {
    expect(publicUrl("audio", "track.mp3")).toBe("local:audio/track.mp3");
    expect(publicUrl("covers", "cover.webp")).toBe("/api/media/covers/cover.webp");
  });

  it("resolves routed covers inside MEDIA_ROOT and rejects traversal", () => {
    expect(resolvePublicPath("/api/media/covers/cover.webp")).toBe(
      join(mediaRoot(), "covers", "cover.webp")
    );
    expect(resolvePublicPath("/api/media/covers/..%2Fsecret")).toBeNull();
    expect(resolvePublicPath("local:audio/../secret")).toBeNull();
  });
});
