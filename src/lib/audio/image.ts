import { safeExtension } from "./validate";

export type ImageMagicValidation =
  | { ok: true }
  | { ok: false; message: string };

function startsWith(bytes: Uint8Array, values: number[]): boolean {
  return values.every((value, index) => bytes[index] === value);
}

function asciiAt(bytes: Uint8Array, offset: number, value: string): boolean {
  return [...value].every((character, index) => bytes[offset + index] === character.charCodeAt(0));
}

function detectedImageType(bytes: Uint8Array): "jpg" | "png" | "gif" | "webp" | "avif" | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (asciiAt(bytes, 0, "GIF87a") || asciiAt(bytes, 0, "GIF89a")) return "gif";
  if (asciiAt(bytes, 0, "RIFF") && asciiAt(bytes, 8, "WEBP")) return "webp";
  if (asciiAt(bytes, 4, "ftyp") && (asciiAt(bytes, 8, "avif") || asciiAt(bytes, 8, "avis"))) return "avif";
  return null;
}

function extensionMatches(extension: string, detected: NonNullable<ReturnType<typeof detectedImageType>>): boolean {
  if (detected === "jpg") return extension === ".jpg" || extension === ".jpeg";
  return extension === `.${detected}`;
}

export async function validateImageMagic(file: File): Promise<ImageMagicValidation> {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const detected = detectedImageType(bytes);
  if (!detected) {
    return { ok: false, message: "Cover image contents are not a supported image." };
  }
  if (!extensionMatches(safeExtension(file.name), detected)) {
    return { ok: false, message: "Cover image extension does not match its contents." };
  }
  return { ok: true };
}
