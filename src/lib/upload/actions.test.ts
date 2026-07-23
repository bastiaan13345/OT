import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUploadCreator: vi.fn(),
  updateUser: vi.fn(),
  createPreset: vi.fn(),
  findPreset: vi.fn(),
  updatePreset: vi.fn(),
  deletePreset: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("./data", () => ({ requireUploadCreator: mocks.requireUploadCreator }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { update: mocks.updateUser },
    uploadPreset: {
      create: mocks.createPreset,
      findFirst: mocks.findPreset,
      update: mocks.updatePreset,
      delete: mocks.deletePreset,
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
    mocks.findPreset.mockResolvedValue({ id: "preset-1" });
    mocks.updatePreset.mockResolvedValue({ id: "preset-1" });
    mocks.deletePreset.mockResolvedValue({ id: "preset-1" });
  });

  it("updates only the current creator's validated upload concurrency", async () => {
    await expect(updateUploadConcurrency(3)).resolves.toEqual({ concurrency: 3 });

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

    await expect(createUploadPreset(formData)).resolves.toEqual({ presetId: "preset-1" });

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

  it("does not update a preset outside the persisted creator scope", async () => {
    mocks.findPreset.mockResolvedValue(null);

    await expect(updateUploadPreset("other-preset", new FormData())).rejects.toThrow("Preset not found.");

    expect(mocks.findPreset).toHaveBeenCalledWith({
      where: { id: "other-preset", userId: "creator-1" },
      select: { id: true },
    });
    expect(mocks.updatePreset).not.toHaveBeenCalled();
  });

  it("deletes only a preset found in the persisted creator scope", async () => {
    await expect(deleteUploadPreset("preset-1")).resolves.toEqual({ presetId: "preset-1" });

    expect(mocks.findPreset).toHaveBeenCalledWith({
      where: { id: "preset-1", userId: "creator-1" },
      select: { id: true },
    });
    expect(mocks.deletePreset).toHaveBeenCalledWith({
      where: { id: "preset-1" },
      select: { id: true },
    });
  });
});
