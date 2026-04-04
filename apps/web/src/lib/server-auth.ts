import { auth } from "@/src/domains/auth/auth";

export const RECENT_AUTH_WINDOW_MS = 10 * 60 * 1000;

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function hasRecentAuthentication(
  authenticatedAt?: number,
  now: number = Date.now()
): boolean {
  if (typeof authenticatedAt !== "number") {
    return false;
  }

  return now - authenticatedAt <= RECENT_AUTH_WINDOW_MS;
}

export async function getAuthenticatedUserId(): Promise<number | null> {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  if (!userId || Number.isNaN(userId)) {
    return null;
  }

  return userId;
}

export async function requireAuthenticatedSession() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const userId = Number(session.user.id);

  if (Number.isNaN(userId)) {
    throw new UnauthorizedError();
  }

  return session;
}

export async function requireAuthenticatedUserId(): Promise<number> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    throw new UnauthorizedError();
  }

  return userId;
}
