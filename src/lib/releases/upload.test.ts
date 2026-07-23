import { describe, expect, it } from "vitest";

import {
  canManageRelease,
  createReleaseFromUpload,
  parseReleaseUpload,
  ReleaseUploadError,
  type ReleaseUploadDependencies,
} from "./upload";

function form(entries: Record<string, string | File>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("parseReleaseUpload", () => {
  it("parses a valid album upload including its creation key and date", () => {
    const parsed = parseReleaseUpload(form({
      creationKey: "release-create-1",
      title: "  Night Drive  ",
      type: "album",
      releaseDate: "2026-07-24",
      description: "  A late set. ",
      published: "draft",
    }));

    expect(parsed).toMatchObject({
      creationKey: "release-create-1",
      title: "Night Drive",
      type: "album",
      releaseDate: "2026-07-24",
      description: "A late set.",
      published: false,
      cover: null,
    });
  });

  it("rejects a missing creation key", () => {
    expect(() => parseReleaseUpload(form({ title: "Night Drive" }))).toThrow(ReleaseUploadError);
  });

  it.each(["", "x".repeat(201)])("rejects an invalid title", (title) => {
    expect(() => parseReleaseUpload(form({ creationKey: "key", title }))).toThrow(ReleaseUploadError);
  });

  it("rejects a release type outside the supported exact values", () => {
    expect(() => parseReleaseUpload(form({ creationKey: "key", title: "Night Drive", type: "Album" }))).toThrow(ReleaseUploadError);
    expect(() => parseReleaseUpload(form({ creationKey: "key", title: "Night Drive", type: " album " }))).toThrow(ReleaseUploadError);
  });

  it("rejects invalid ISO calendar dates", () => {
    expect(() => parseReleaseUpload(form({ creationKey: "key", title: "Night Drive", releaseDate: "2026-02-30" }))).toThrow(ReleaseUploadError);
    expect(() => parseReleaseUpload(form({ creationKey: "key", title: "Night Drive", releaseDate: " 2026-07-24 " }))).toThrow(ReleaseUploadError);
  });

  it("accepts omitted cover and type, and treats any non-draft value as published", () => {
    const parsed = parseReleaseUpload(form({ creationKey: "key", title: "Night Drive", published: "on" }));
    expect(parsed).toMatchObject({ type: "single", cover: null, published: true });
  });

  it("rejects a non-file cover value", () => {
    expect(() => parseReleaseUpload(form({ creationKey: "key", title: "Night Drive", cover: "not-a-file" }))).toThrow(ReleaseUploadError);
  });
});

describe("canManageRelease", () => {
  it("allows the owner or an admin, but not a different creator", () => {
    expect(canManageRelease({ userId: "creator-1", role: "CREATOR" }, "creator-1")).toBe(true);
    expect(canManageRelease({ userId: "creator-1", role: "CREATOR" }, "creator-2")).toBe(false);
    expect(canManageRelease({ userId: "admin-1", role: "ADMIN" }, "creator-2")).toBe(true);
  });
});

function uploadForm(cover?: File) {
  return form({
    creationKey: "release-create-1",
    title: "Night Drive",
    type: "album",
    ...(cover ? { cover } : {}),
  });
}

function dependencies(overrides: Partial<ReleaseUploadDependencies> = {}): ReleaseUploadDependencies {
  return {
    findUserById: async () => ({ id: "creator-1", role: "CREATOR" }),
    findReleaseByCreationKey: async () => null,
    createRelease: async () => ({ id: "release-1", creatorId: "creator-1", coverUrl: "/uploads/covers/night-drive.jpg" }),
    ensureUploadDir: async () => "/tmp/covers",
    uniqueFileName: () => "night-drive.jpg",
    publicUrl: () => "/uploads/covers/night-drive.jpg",
    writeFile: async () => undefined,
    unlink: async () => undefined,
    ...overrides,
  };
}

describe("createReleaseFromUpload", () => {
  const session = { user: { id: "creator-1", role: "CREATOR" } };

  it("resolves the persisted creator from the session id and current role", async () => {
    const findUserById = async (id: string) => {
      expect(id).toBe("creator-1");
      return { id, role: "CREATOR" };
    };

    await expect(createReleaseFromUpload(uploadForm(), session, dependencies({ findUserById }))).resolves.toEqual({
      releaseId: "release-1",
      coverUrl: "/uploads/covers/night-drive.jpg",
    });
  });

  it("returns a same-creator retry without writing another cover", async () => {
    let wrote = false;
    const result = await createReleaseFromUpload(uploadForm(new File(["cover"], "cover.jpg", { type: "image/jpeg" })), session, dependencies({
      findReleaseByCreationKey: async () => ({ id: "release-existing", creatorId: "creator-1", coverUrl: "/uploads/covers/existing.jpg" }),
      writeFile: async () => { wrote = true; },
    }));

    expect(result).toEqual({ releaseId: "release-existing", coverUrl: "/uploads/covers/existing.jpg" });
    expect(wrote).toBe(false);
  });

  it("returns a generic conflict for a creation key owned by another creator", async () => {
    await expect(createReleaseFromUpload(uploadForm(), session, dependencies({
      findReleaseByCreationKey: async () => ({ id: "secret-release", creatorId: "creator-2", coverUrl: "/uploads/covers/secret.jpg" }),
    }))).rejects.toMatchObject({
      name: "ReleaseUploadError",
      status: 409,
      message: "This release request conflicts.",
    });
  });

  it("validates and writes one cover before persisting its public URL", async () => {
    let writePath = "";
    let createdCover: string | null | undefined;
    await createReleaseFromUpload(uploadForm(new File(["cover"], "night drive.jpg", { type: "image/jpeg" })), session, dependencies({
      writeFile: async (path) => { writePath = path; },
      createRelease: async (data) => {
        createdCover = data.coverUrl;
        return { id: "release-1", creatorId: "creator-1", coverUrl: data.coverUrl };
      },
    }));

    expect(writePath).toBe("/tmp/covers/night-drive.jpg");
    expect(createdCover).toBe("/uploads/covers/night-drive.jpg");
  });

  it("rejects an empty submitted cover instead of treating it as absent", async () => {
    await expect(createReleaseFromUpload(uploadForm(new File([], "cover.jpg", { type: "image/jpeg" })), session, dependencies())).rejects.toMatchObject({
      name: "ReleaseUploadError",
      status: 400,
    });
  });

  it("removes a newly written cover when persistence fails", async () => {
    let removed = "";
    await expect(createReleaseFromUpload(uploadForm(new File(["cover"], "cover.jpg", { type: "image/jpeg" })), session, dependencies({
      createRelease: async () => { throw new Error("database unavailable"); },
      unlink: async (path) => { removed = path; },
    }))).rejects.toMatchObject({ status: 500 });

    expect(removed).toBe("/tmp/covers/night-drive.jpg");
  });

  it("cleans a race-lost cover and returns only the same creator's persisted release", async () => {
    let removed = "";
    let lookups = 0;
    await expect(createReleaseFromUpload(uploadForm(new File(["cover"], "cover.jpg", { type: "image/jpeg" })), session, dependencies({
      createRelease: async () => { throw { code: "P2002" }; },
      findReleaseByCreationKey: async () => ++lookups === 1 ? null : ({ id: "release-race", creatorId: "creator-1", coverUrl: "/uploads/covers/race.jpg" }),
      unlink: async (path) => { removed = path; },
    }))).resolves.toEqual({ releaseId: "release-race", coverUrl: "/uploads/covers/race.jpg" });
    expect(removed).toBe("/tmp/covers/night-drive.jpg");

    lookups = 0;
    await expect(createReleaseFromUpload(uploadForm(new File(["cover"], "cover.jpg", { type: "image/jpeg" })), session, dependencies({
      createRelease: async () => { throw { code: "P2002" }; },
      findReleaseByCreationKey: async () => ++lookups === 1 ? null : ({ id: "release-race", creatorId: "creator-2", coverUrl: "/uploads/covers/race.jpg" }),
    }))).rejects.toMatchObject({ status: 409, message: "This release request conflicts." });
  });
});
