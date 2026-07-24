import { describe, expect, it } from "vitest";

import { CurrentActorError, resolveCurrentCreator } from "./actor";

const session = (id = "user-1", email = "session@example.test") => ({ user: { id, email, role: "ADMIN" } });

describe("resolveCurrentCreator", () => {
  it("rejects a user whose current persisted role was downgraded", async () => {
    await expect(resolveCurrentCreator(session(), {
      findUserById: async () => ({ id: "user-1", role: "LISTENER" }),
      findAdminById: async () => null,
      findUserByEmail: async () => null,
    })).rejects.toMatchObject({ name: "CurrentActorError", status: 403 });
  });

  it("bridges a verified Admin id through that Admin's email to its shadow user", async () => {
    const actor = await resolveCurrentCreator(session("admin-1", "untrusted@example.test"), {
      findUserById: async () => null,
      findAdminById: async (id) => id === "admin-1" ? { id, email: "verified-admin@example.test" } : null,
      findUserByEmail: async (email) => email === "verified-admin@example.test" ? { id: "shadow-creator", role: "LISTENER" } : null,
    });

    expect(actor).toEqual({ userId: "shadow-creator", role: "ADMIN" });
  });

  it("rejects a verified Admin that has no shadow user", async () => {
    await expect(resolveCurrentCreator(session("admin-1"), {
      findUserById: async () => null,
      findAdminById: async () => ({ id: "admin-1", email: "verified-admin@example.test" }),
      findUserByEmail: async () => null,
    })).rejects.toMatchObject({ name: "CurrentActorError", status: 403, message: "This account is not linked to a platform user." });
  });

  it("never trusts an unverified or recreated session email", async () => {
    let emailLookup = false;
    await expect(resolveCurrentCreator(session("unknown", "recreated@example.test"), {
      findUserById: async () => null,
      findAdminById: async () => null,
      findUserByEmail: async () => { emailLookup = true; return { id: "wrong-user", role: "CREATOR" }; },
    })).rejects.toBeInstanceOf(CurrentActorError);
    expect(emailLookup).toBe(false);
  });
});
