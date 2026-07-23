import { describe, expect, it } from "vitest";

import { ownedUploadTracksQuery } from "./query-contracts";

describe("ownedUploadTracksQuery", () => {
  it("limits previous-track history to fifty recent rows for the resolved creator", () => {
    expect(ownedUploadTracksQuery("creator-1")).toMatchObject({
      where: { creatorId: "creator-1" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });
});
