export function shouldDeleteSharedCover(
  coverUrl: string | null,
  remainingReleaseReferences: number,
  remainingTrackReferences: number
): boolean {
  return Boolean(
    coverUrl?.startsWith("/uploads/covers/")
    && remainingReleaseReferences === 0
    && remainingTrackReferences === 0
  );
}
