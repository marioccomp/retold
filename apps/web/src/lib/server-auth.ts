import { auth } from "@/src/domains/auth/auth";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function getAuthenticatedUserId(): Promise<number | null> {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  if (!userId || Number.isNaN(userId)) {
    return null;
  }

  return userId;
}

export async function requireAuthenticatedUserId(): Promise<number> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    throw new UnauthorizedError();
  }

  return userId;
}
