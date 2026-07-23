import { describe, expect, it } from "vitest";

import { persistedCreatorId, canManageUploadSettings } from "./creator-resolution";

describe("persistedCreatorId", () => {
  it("uses only the authenticated session id and never falls back to email", () => {
    expect(persistedCreatorId({ id: "creator-1", email: "creator@example.com" })).toBe("creator-1");
    expect(persistedCreatorId({ email: "admin@example.com" })).toBeNull();
  });
});

describe("canManageUploadSettings", () => {
  it("uses the current persisted user role", () => {
    expect(canManageUploadSettings("CREATOR")).toBe(true);
    expect(canManageUploadSettings("ADMIN")).toBe(true);
    expect(canManageUploadSettings("LISTENER")).toBe(false);
    expect(canManageUploadSettings(null)).toBe(false);
  });
});
