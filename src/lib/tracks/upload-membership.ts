export type AlbumMembership = {
  releaseId: string;
  position: number;
  creationKey: string;
};

export function parseAlbumMembership(formData: FormData): AlbumMembership | null {
  const releaseId = String(formData.get("releaseId") ?? "").trim();
  if (!releaseId) return null;

  const creationKey = String(formData.get("creationKey") ?? "").trim();
  if (!creationKey) throw new Error("An album track creation key is required.");

  const position = Number(formData.get("position"));
  if (!Number.isInteger(position) || position < 0) {
    throw new Error("Track position must be a non-negative integer.");
  }

  return { releaseId, position, creationKey };
}
