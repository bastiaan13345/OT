"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CREATOR_SETTINGS_UNAVAILABLE, requireUploadCreator } from "./data";
import { normalizePresetName, parseUploadConcurrency, presetPatchFromFormData } from "./preferences";
import { presetStorageData } from "./preset-persistence";

export type UploadActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const PRESET_ID_PATTERN = /^[A-Za-z0-9_-]{1,191}$/;

function success<T>(data: T): UploadActionResult<T> {
  return { ok: true, data };
}

function failure<T>(error: string): UploadActionResult<T> {
  return { ok: false, error };
}

function revalidateUploadPreferences() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/upload");
}

function isUniquePresetNameError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function expectedErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to save your upload preferences.";
}

async function getCreator() {
  const creator = await requireUploadCreator();

  return creator ?? null;
}

function requiredPresetName(formData: FormData) {
  const name = formData.get("name");

  if (typeof name !== "string") {
    throw new Error("Preset name must be between 1 and 80 characters.");
  }

  return normalizePresetName(name);
}

function validatePresetId(presetId: string) {
  if (!PRESET_ID_PATTERN.test(presetId)) {
    throw new Error("Invalid preset.");
  }
}

export async function updateUploadConcurrency(value: number): Promise<UploadActionResult<{ concurrency: number }>> {
  let concurrency: number;

  try {
    concurrency = parseUploadConcurrency(value);
  } catch (error) {
    return failure(expectedErrorMessage(error));
  }

  const creator = await getCreator();

  if (!creator) {
    return failure(CREATOR_SETTINGS_UNAVAILABLE);
  }

  const user = await prisma.user.update({
    where: { id: creator.id },
    data: { uploadConcurrency: concurrency },
    select: { uploadConcurrency: true },
  });

  revalidateUploadPreferences();
  return success({ concurrency: user.uploadConcurrency });
}

export async function createUploadPreset(formData: FormData): Promise<UploadActionResult<{ presetId: string }>> {
  const creator = await getCreator();

  if (!creator) {
    return failure(CREATOR_SETTINGS_UNAVAILABLE);
  }

  let name: string;
  let normalizedName: string;
  let data;

  try {
    ({ name, normalizedName } = requiredPresetName(formData));
    data = presetStorageData(presetPatchFromFormData(formData));
  } catch (error) {
    return failure(expectedErrorMessage(error));
  }

  try {
    const preset = await prisma.uploadPreset.create({
      data: { userId: creator.id, name, normalizedName, ...data },
      select: { id: true },
    });

    revalidateUploadPreferences();
    return success({ presetId: preset.id });
  } catch (error) {
    if (isUniquePresetNameError(error)) {
      return failure("A preset with this name already exists.");
    }

    throw error;
  }
}

export async function updateUploadPreset(
  presetId: string,
  formData: FormData,
): Promise<UploadActionResult<{ presetId: string }>> {
  try {
    validatePresetId(presetId);
  } catch (error) {
    return failure(expectedErrorMessage(error));
  }

  const creator = await getCreator();

  if (!creator) {
    return failure(CREATOR_SETTINGS_UNAVAILABLE);
  }

  let name: string;
  let normalizedName: string;
  let data;

  try {
    ({ name, normalizedName } = requiredPresetName(formData));
    data = presetStorageData(presetPatchFromFormData(formData));
  } catch (error) {
    return failure(expectedErrorMessage(error));
  }

  let result: { count: number };

  try {
    result = await prisma.uploadPreset.updateMany({
      where: { id: presetId, userId: creator.id },
      data: { name, normalizedName, ...data },
    });
  } catch (error) {
    if (isUniquePresetNameError(error)) {
      return failure("A preset with this name already exists.");
    }

    throw error;
  }

  if (result.count !== 1) {
    return failure("Preset not found.");
  }

  revalidateUploadPreferences();
  return success({ presetId });
}

export async function deleteUploadPreset(presetId: string): Promise<UploadActionResult<{ presetId: string }>> {
  try {
    validatePresetId(presetId);
  } catch (error) {
    return failure(expectedErrorMessage(error));
  }

  const creator = await getCreator();

  if (!creator) {
    return failure(CREATOR_SETTINGS_UNAVAILABLE);
  }

  const result = await prisma.uploadPreset.deleteMany({
    where: { id: presetId, userId: creator.id },
  });

  if (result.count !== 1) {
    return failure("Preset not found.");
  }

  revalidateUploadPreferences();
  return success({ presetId });
}
