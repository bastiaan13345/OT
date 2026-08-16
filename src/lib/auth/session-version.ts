export type SessionAccountType = "admin" | "user";

type VersionedToken = {
  id?: unknown;
  role?: unknown;
  accountType?: unknown;
  sessionVersion?: unknown;
  authInvalidated?: unknown;
  [key: string]: unknown;
};

export type SessionVersionDependencies = {
  findUser: (id: string) => Promise<{ role: string; sessionVersion: number } | null>;
  findAdmin: (id: string) => Promise<{ sessionVersion: number } | null>;
};

function invalidate<T extends VersionedToken>(token: T): T {
  return {
    ...token,
    id: "",
    role: "REVOKED",
    authInvalidated: true,
  } as T;
}

export async function refreshVersionedToken<T extends VersionedToken>(
  token: T,
  dependencies: SessionVersionDependencies
): Promise<T> {
  if (token.authInvalidated) return invalidate(token);
  if (
    typeof token.id !== "string"
    || !token.id
    || (token.accountType !== "user" && token.accountType !== "admin")
    || !Number.isInteger(token.sessionVersion)
  ) {
    return invalidate(token);
  }

  if (token.accountType === "user") {
    const account = await dependencies.findUser(token.id);
    if (!account || account.sessionVersion !== token.sessionVersion) {
      return invalidate(token);
    }
    return { ...token, role: account.role, authInvalidated: false } as T;
  }

  const account = await dependencies.findAdmin(token.id);
  if (!account || account.sessionVersion !== token.sessionVersion) {
    return invalidate(token);
  }
  return { ...token, role: "ADMIN", authInvalidated: false } as T;
}
