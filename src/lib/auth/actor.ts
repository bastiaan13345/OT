export type CurrentCreatorActor = {
  userId: string;
  role: "CREATOR" | "ADMIN";
};

export type CurrentActorDependencies = {
  findUserById: (id: string) => Promise<{ id: string; role: string } | null>;
  findAdminById: (id: string) => Promise<{ id: string; email: string } | null>;
  findUserByEmail: (email: string) => Promise<{ id: string; role: string } | null>;
};

type SessionLike = {
  user?: { id?: string | null } | null;
};

export class CurrentActorError extends Error {
  constructor(message: string, public readonly status = 403) {
    super(message);
    this.name = "CurrentActorError";
  }
}

export async function resolveCurrentCreator(
  session: SessionLike,
  dependencies: CurrentActorDependencies
): Promise<CurrentCreatorActor> {
  const sessionId = session.user?.id;
  if (!sessionId) {
    throw new CurrentActorError("This account is not linked to a platform user.");
  }

  const user = await dependencies.findUserById(sessionId);
  if (user) {
    if (user.role === "CREATOR" || user.role === "ADMIN") {
      return { userId: user.id, role: user.role };
    }
    throw new CurrentActorError("A creator account is required for this action.");
  }

  const admin = await dependencies.findAdminById(sessionId);
  if (!admin) {
    throw new CurrentActorError("This account is not linked to a platform user.");
  }

  const shadowUser = await dependencies.findUserByEmail(admin.email);
  if (!shadowUser) {
    throw new CurrentActorError("This account is not linked to a platform user.");
  }
  return { userId: shadowUser.id, role: "ADMIN" };
}
