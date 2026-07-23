type SessionIdentity = {
  id?: string | null;
  email?: string | null;
};

/** Session email is intentionally never an authorization or ownership fallback. */
export function persistedCreatorId(user: SessionIdentity) {
  return typeof user.id === "string" && user.id.length > 0 ? user.id : null;
}

/** Checks the current database role, never a potentially stale JWT claim. */
export function canManageUploadSettings(role: string | null | undefined) {
  return role === "CREATOR" || role === "ADMIN";
}
