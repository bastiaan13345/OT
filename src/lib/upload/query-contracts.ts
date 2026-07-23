const ownedUploadTrackSelect = {
  id: true,
  title: true,
  artist: true,
  genre: true,
  album: true,
  tags: true,
  license: true,
  description: true,
  price: true,
  releaseDate: true,
  allowDownload: true,
  published: true,
} as const;

/** The upload preset picker never loads an unbounded catalog. */
export function ownedUploadTracksQuery(creatorId: string) {
  return {
    where: { creatorId },
    orderBy: { createdAt: "desc" as const },
    take: 50,
    select: ownedUploadTrackSelect,
  };
}
