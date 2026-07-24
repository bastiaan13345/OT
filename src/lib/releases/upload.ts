export class ReleaseUploadError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "ReleaseUploadError";
  }
}

export type ReleaseActor = {
  userId: string;
  role: string | null | undefined;
};

export type ParsedReleaseUpload = {
  creationKey: string;
  title: string;
  description: string | null;
  type: "single" | "ep" | "album";
  releaseDate: string | null;
  published: boolean;
  cover: File | null;
};

const RELEASE_TYPES = new Set<ParsedReleaseUpload["type"]>(["single", "ep", "album"]);

function invalid(message: string): never {
  throw new ReleaseUploadError(message);
}

function stringEntry(
  formData: FormData,
  field: string,
  maxLength: number,
  required = false
): string {
  const value = formData.get(field);
  if (value === null) {
    if (required) invalid(`${field} is required.`);
    return "";
  }
  if (typeof value !== "string") invalid(`${field} must be text.`);
  if (value.length > maxLength) invalid(`${field} is too long.`);
  const trimmed = value.trim();
  if (required && !trimmed) invalid(`${field} is required.`);
  return trimmed;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export function parseReleaseUpload(formData: FormData): ParsedReleaseUpload {
  const creationKey = stringEntry(formData, "creationKey", 128, true);
  const title = stringEntry(formData, "title", 200, true);
  const description = stringEntry(formData, "description", 5_000);
  const typeValue = formData.get("type");
  if (typeValue !== null && typeof typeValue !== "string") {
    invalid("type must be text.");
  }
  if (typeof typeValue === "string" && typeValue.length > 16) {
    invalid("type is too long.");
  }
  const typeEntry = typeValue || "single";
  if (!RELEASE_TYPES.has(typeEntry as ParsedReleaseUpload["type"])) {
    invalid("Release type must be single, ep, or album.");
  }

  const releaseDateEntry = stringEntry(formData, "releaseDate", 10);
  if (releaseDateEntry && !isValidIsoDate(releaseDateEntry)) {
    invalid("Release date is invalid.");
  }

  const publishedEntry = formData.get("published");
  if (publishedEntry !== null && typeof publishedEntry !== "string") {
    invalid("published must be text.");
  }

  const coverEntry = formData.get("cover");
  if (coverEntry !== null && !(coverEntry instanceof File)) {
    invalid("cover must be a file.");
  }

  return {
    creationKey,
    title,
    description: description || null,
    type: typeEntry as ParsedReleaseUpload["type"],
    releaseDate: releaseDateEntry || null,
    published: publishedEntry !== "draft",
    cover: coverEntry,
  };
}

export function canManageRelease(actor: ReleaseActor, creatorId: string): boolean {
  return actor.role === "ADMIN" || actor.userId === creatorId;
}

type StoredRelease = {
  id: string;
  creatorId: string;
  coverUrl: string | null;
};

type NewRelease = {
  creationKey: string;
  title: string;
  description: string | null;
  type: ParsedReleaseUpload["type"];
  releaseDate: Date | null;
  published: boolean;
  creatorId: string;
  coverUrl: string | null;
};

export type ReleaseUploadDependencies = CurrentActorDependencies & {
  findReleaseByCreationKey: (creationKey: string) => Promise<StoredRelease | null>;
  createRelease: (data: NewRelease) => Promise<StoredRelease>;
  ensureUploadDir: () => Promise<string>;
  uniqueFileName: (base: string, extension: string) => string;
  publicUrl: (fileName: string) => string;
  writeFile: (path: string, contents: Uint8Array) => Promise<void>;
  unlink: (path: string) => Promise<void>;
};

const defaultDependencies: ReleaseUploadDependencies = {
  findUserById: (id) => prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  }),
  findAdminById: (id) => prisma.admin.findUnique({
    where: { id },
    select: { id: true, email: true },
  }),
  findUserByEmail: (email) => prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  }),
  findReleaseByCreationKey: (creationKey) => prisma.release.findUnique({
    where: { creationKey },
    select: { id: true, creatorId: true, coverUrl: true },
  }),
  createRelease: (data) => prisma.release.create({
    data,
    select: { id: true, creatorId: true, coverUrl: true },
  }),
  ensureUploadDir: () => ensureDir("covers"),
  uniqueFileName: makeUniqueFileName,
  publicUrl: (fileName) => makePublicUrl("covers", fileName),
  writeFile: (path, contents) => writeFileToDisk(path, contents),
  unlink: unlinkFile,
};

type UploadSession = {
  user?: {
    id?: string | null;
    role?: string | null;
  } | null;
};

function conflict(): never {
  throw new ReleaseUploadError("This release request conflicts.", 409);
}

function existingResult(release: StoredRelease, creatorId: string) {
  if (release.creatorId !== creatorId) conflict();
  return { releaseId: release.id, coverUrl: release.coverUrl };
}

function toUtcNoon(isoDate: string | null): Date | null {
  return isoDate ? new Date(`${isoDate}T12:00:00.000Z`) : null;
}

export async function createReleaseFromUpload(
  formData: FormData,
  session: UploadSession,
  dependencies: ReleaseUploadDependencies = defaultDependencies
): Promise<{ releaseId: string; coverUrl: string | null }> {
  const parsed = parseReleaseUpload(formData);
  let actor;
  try {
    actor = await resolveCurrentCreator(session, dependencies);
  } catch (error) {
    if (error instanceof CurrentActorError) {
      throw new ReleaseUploadError(error.message, error.status);
    }
    throw error;
  }

  const existing = await dependencies.findReleaseByCreationKey(parsed.creationKey);
  if (existing) return existingResult(existing, actor.userId);

  let coverUrl: string | null = null;
  let writtenCoverPath: string | null = null;
  try {
    if (parsed.cover) {
      const coverCheck = validateImageFile(parsed.cover);
      if (!coverCheck.ok) throw new ReleaseUploadError(coverCheck.message);
      const magicCheck = await validateImageMagic(parsed.cover);
      if (!magicCheck.ok) throw new ReleaseUploadError(magicCheck.message);

      const coverDir = await dependencies.ensureUploadDir();
      const fileName = dependencies.uniqueFileName(
        sanitizeBaseName(parsed.cover.name),
        coverCheck.ext
      );
      writtenCoverPath = join(coverDir, fileName);
      await dependencies.writeFile(
        writtenCoverPath,
        new Uint8Array(await parsed.cover.arrayBuffer())
      );
      coverUrl = dependencies.publicUrl(fileName);
    }

    const created = await dependencies.createRelease({
      creationKey: parsed.creationKey,
      title: parsed.title,
      description: parsed.description,
      type: parsed.type,
      releaseDate: toUtcNoon(parsed.releaseDate),
      published: parsed.published,
      creatorId: actor.userId,
      coverUrl,
    });
    return { releaseId: created.id, coverUrl: created.coverUrl };
  } catch (error) {
    if (writtenCoverPath) await dependencies.unlink(writtenCoverPath).catch(() => {});

    if ((error as { code?: string } | null)?.code === "P2002") {
      const racedRelease = await dependencies.findReleaseByCreationKey(parsed.creationKey);
      if (racedRelease) return existingResult(racedRelease, actor.userId);
      conflict();
    }
    if (error instanceof ReleaseUploadError) throw error;
    throw new ReleaseUploadError("Release upload failed. Please try again.", 500);
  }
}
import { unlink as unlinkFile, writeFile as writeFileToDisk } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { ensureUploadDir as ensureDir, publicUrl as makePublicUrl, uniqueFileName as makeUniqueFileName } from "@/lib/audio/storage";
import { sanitizeBaseName, validateImageFile } from "@/lib/audio/validate";
import { validateImageMagic } from "@/lib/audio/image";
import {
  CurrentActorError,
  resolveCurrentCreator,
  type CurrentActorDependencies,
} from "@/lib/auth/actor";
