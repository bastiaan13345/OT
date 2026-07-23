import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUploadCreator: vi.fn(),
  updateUser: vi.fn(),
  createPreset: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("./data", () => ({ requireUploadCreator: mocks.requireUploadCreator }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { update: mocks.updateUser },
    uploadPreset: {
      create: mocks.createPreset,
      updateMany: mocks.updateMany,
      deleteMany: mocks.deleteMany,
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  createUploadPreset,
  deleteUploadPreset,
  updateUploadConcurrency,
  updateUploadPreset,
} from "./actions";

describe("creator upload preference actions", () => {
  beforeEach(() => {
    mocks.requireUploadCreator.mockResolvedValue({ id: "creator-1" });
    mocks.updateUser.mockResolvedValue({ uploadConcurrency: 3 });
    mocks.createPreset.mockResolvedValue({ id: "preset-1" });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("updates only the current creator's validated upload concurrency", async () => {
    await expect(updateUploadConcurrency(3)).resolves.toEqual({ ok: true, data: { concurrency: 3 } });

    expect(mocks.updateUser).toHaveBeenCalledWith({
      where: { id: "creator-1" },
      data: { uploadConcurrency: 3 },
      select: { uploadConcurrency: true },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/settings");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/upload");
  });

  it("creates a normalized creator-owned preset", async () => {
    const formData = new FormData();
    formData.set("name", "  Night Set ");
    formData.set("artist", " Nova Vale ");

    await expect(createUploadPreset(formData)).resolves.toEqual({ ok: true, data: { presetId: "preset-1" } });

    expect(mocks.createPreset).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "creator-1",
        name: "Night Set",
        normalizedName: "night set",
        artist: "Nova Vale",
      }),
      select: { id: true },
    });
  });

  it("updates atomically within the persisted creator scope", async () => {
    const formData = new FormData();
    formData.set("name", "Night set");

    await expect(updateUploadPreset("preset-1", formData)).resolves.toEqual({
      ok: true,
      data: { presetId: "preset-1" },
    });

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "preset-1", userId: "creator-1" },
      data: expect.objectContaining({ name: "Night set", normalizedName: "night set" }),
    });
  });

  it("returns not found when the atomic update affects no owned preset", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const formData = new FormData();
    formData.set("name", "Night set");

    await expect(updateUploadPreset("other-preset", formData)).resolves.toEqual({
      ok: false,
      error: "Preset not found.",
    });
  });

  it("deletes atomically within the persisted creator scope", async () => {
    await expect(deleteUploadPreset("preset-1")).resolves.toEqual({
      ok: true,
      data: { presetId: "preset-1" },
    });

    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { id: "preset-1", userId: "creator-1" },
    });
  });

  it("returns serializable expected errors for validation, duplicates, and failed deletion", async () => {
    mocks.createPreset.mockRejectedValueOnce({ code: "P2002" });
    mocks.deleteMany.mockResolvedValueOnce({ count: 0 });

    const duplicate = new FormData();
    duplicate.set("name", "Night set");

    await expect(createUploadPreset(duplicate)).resolves.toEqual({
      ok: false,
      error: "A preset with this name already exists.",
    });
    await expect(updateUploadConcurrency(5)).resolves.toEqual({
      ok: false,
      error: "Upload concurrency must be an integer between 1 and 4.",
    });
    await expect(deleteUploadPreset("preset-1")).resolves.toEqual({
      ok: false,
      error: "Preset not found.",
    });
  });

  it("returns the duplicate-name error when an atomic edit conflicts", async () => {
    mocks.updateMany.mockRejectedValueOnce({ code: "P2002" });
    const formData = new FormData();
    formData.set("name", "Night set");

    await expect(updateUploadPreset("preset-1", formData)).resolves.toEqual({
      ok: false,
      error: "A preset with this name already exists.",
    });
  });
});
