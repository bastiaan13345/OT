"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CREATOR_SETTINGS_UNAVAILABLE, requireUploadCreator } from "./data";
import { normalizePresetName, parseUploadConcurrency, presetPatchFromFormData } from "./preferences";
import { presetStorageData } from "./preset-persistence";

function revalidateUploadPreferences() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/upload");
}

function isUniquePresetNameError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function getCreatorOrThrow() {
  const creator = await requireUploadCreator();

  if (!creator) {
    throw new Error(CREATOR_SETTINGS_UNAVAILABLE);
  }

  return creator;
}

function requiredPresetName(formData: FormData) {
  const name = formData.get("name");

  return normalizePresetName(typeof name === "string" ? name : "");
}

export async function updateUploadConcurrency(value: number) {
  const creator = await getCreatorOrThrow();
  const concurrency = parseUploadConcurrency(value);
  const user = await prisma.user.update({
    where: { id: creator.id },
    data: { uploadConcurrency: concurrency },
    select: { uploadConcurrency: true },
  });

  revalidateUploadPreferences();
  return { concurrency: user.uploadConcurrency };
}

export async function createUploadPreset(formData: FormData) {
  const creator = await getCreatorOrThrow();
  const { name, normalizedName } = requiredPresetName(formData);
  const data = presetStorageData(presetPatchFromFormData(formData));

  try {
    const preset = await prisma.uploadPreset.create({
      data: { userId: creator.id, name, normalizedName, ...data },
      select: { id: true },
    });

    revalidateUploadPreferences();
    return { presetId: preset.id };
  } catch (error) {
    if (isUniquePresetNameError(error)) {
      throw new Error("A preset with this name already exists.");
    }

    throw new Error("Unable to save this preset. Please try again.");
  }
}

export async function updateUploadPreset(presetId: string, formData: FormData) {
  const creator = await getCreatorOrThrow();
  const ownedPreset = await prisma.uploadPreset.findFirst({
    where: { id: presetId, userId: creator.id },
    select: { id: true },
  });

  if (!ownedPreset) {
    throw new Error("Preset not found.");
  }

  const { name, normalizedName } = requiredPresetName(formData);
  const data = presetStorageData(presetPatchFromFormData(formData));

  try {
    const preset = await prisma.uploadPreset.update({
      where: { id: ownedPreset.id },
      data: { name, normalizedName, ...data },
      select: { id: true },
    });

    revalidateUploadPreferences();
    return { presetId: preset.id };
  } catch (error) {
    if (isUniquePresetNameError(error)) {
      throw new Error("A preset with this name already exists.");
    }

    throw new Error("Unable to save this preset. Please try again.");
  }
}

export async function deleteUploadPreset(presetId: string) {
  const creator = await getCreatorOrThrow();
  const ownedPreset = await prisma.uploadPreset.findFirst({
    where: { id: presetId, userId: creator.id },
    select: { id: true },
  });

  if (!ownedPreset) {
    throw new Error("Preset not found.");
  }

  try {
    const preset = await prisma.uploadPreset.delete({
      where: { id: ownedPreset.id },
      select: { id: true },
    });

    revalidateUploadPreferences();
    return { presetId: preset.id };
  } catch {
    throw new Error("Unable to delete this preset. Please try again.");
  }
}
