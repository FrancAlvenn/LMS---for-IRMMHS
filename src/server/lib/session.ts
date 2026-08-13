/**
 * Stub until Phase 3 (Identity & access) exists. Every route handler that
 * needs createdBy/updatedBy calls this instead of hardcoding null, so
 * wiring up real auth later is a one-file change instead of a grep across
 * every route. See CLAUDE.md decision log, D5.
 */
export async function getCurrentUserId(): Promise<string | null> {
  // TODO(Phase 3): read the Auth.js session and return the user's id.
  return null;
}
