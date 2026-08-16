import { describe, expect, it, vi } from "vitest";
import { refreshVersionedToken } from "./session-version";

function dependencies(overrides: Partial<Parameters<typeof refreshVersionedToken>[1]> = {}) {
  return {
    findUser: vi.fn(async () => ({ role: "CREATOR", sessionVersion: 3 })),
    findAdmin: vi.fn(async () => ({ sessionVersion: 3 })),
    ...overrides,
  };
}

describe("refreshVersionedToken", () => {
  it("refreshes a user's persisted role when the session version still matches", async () => {
    const result = await refreshVersionedToken({
      id: "user-1",
      role: "ADMIN",
      accountType: "user",
      sessionVersion: 3,
    }, dependencies({ findUser: vi.fn(async () => ({ role: "LISTENER", sessionVersion: 3 })) }));

    expect(result).toMatchObject({ id: "user-1", role: "LISTENER", authInvalidated: false });
  });

  it("invalidates an existing session after a password or role reset", async () => {
    const result = await refreshVersionedToken({
      id: "user-1",
      role: "CREATOR",
      accountType: "user",
      sessionVersion: 2,
    }, dependencies());

    expect(result).toMatchObject({ id: "", role: "REVOKED", authInvalidated: true });
  });

  it("invalidates deleted and legacy accounts", async () => {
    const missing = dependencies({ findAdmin: vi.fn(async () => null) });
    await expect(refreshVersionedToken({
      id: "admin-1",
      role: "ADMIN",
      accountType: "admin",
      sessionVersion: 3,
    }, missing)).resolves.toMatchObject({ authInvalidated: true });

    await expect(refreshVersionedToken({ id: "legacy", role: "ADMIN" }, dependencies()))
      .resolves.toMatchObject({ authInvalidated: true });
  });
});
