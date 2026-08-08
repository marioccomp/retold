import { beforeEach, describe, expect, it, vi } from "vitest";

// auth() is overloaded (plain session lookup vs. route-handler/middleware
// wrapping), which makes `vi.mocked(auth).mockResolvedValue(...)` resolve to
// the wrong overload's type. Driving the mock through a plain async factory
// sidesteps that — same pattern used in the integration specs.
const { currentSession } = vi.hoisted(() => ({
  currentSession: {
    value: null as any,
  },
}));

vi.mock("@/src/domains/auth/auth", () => ({
  auth: vi.fn(async () => currentSession.value),
}));

import {
  RECENT_AUTH_WINDOW_MS,
  UnauthorizedError,
  getAuthenticatedUserId,
  hasRecentAuthentication,
  requireAuthenticatedSession,
  requireAuthenticatedUserId,
} from "./server-auth";

describe("server-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSession.value = null;
  });

  describe("hasRecentAuthentication", () => {
    it("should return true when authentication is inside the allowed window", () => {
      const now = 1_000_000;
      const authenticatedAt = now - RECENT_AUTH_WINDOW_MS + 1;

      expect(hasRecentAuthentication(authenticatedAt, now)).toBe(true);
    });

    it("should return true at the exact allowed boundary", () => {
      const now = 1_000_000;
      const authenticatedAt = now - RECENT_AUTH_WINDOW_MS;

      expect(hasRecentAuthentication(authenticatedAt, now)).toBe(true);
    });

    it("should return false when authentication is missing or expired", () => {
      const now = 1_000_000;

      expect(hasRecentAuthentication(undefined, now)).toBe(false);
      expect(hasRecentAuthentication(now - RECENT_AUTH_WINDOW_MS - 1, now)).toBe(false);
    });
  });

  describe("getAuthenticatedUserId", () => {
    it("should return the numeric user id when the session is valid", async () => {
      currentSession.value = {
        user: {
          id: "42",
        },
      };

      await expect(getAuthenticatedUserId()).resolves.toBe(42);
    });

    it("should return null when the session is missing or invalid", async () => {
      currentSession.value = null;
      await expect(getAuthenticatedUserId()).resolves.toBeNull();

      currentSession.value = {
        user: {
          id: "not-a-number",
        },
      };
      await expect(getAuthenticatedUserId()).resolves.toBeNull();
    });
  });

  describe("requireAuthenticatedSession", () => {
    it("should return the session when it contains a valid numeric id", async () => {
      const session = {
        user: {
          id: "7",
          email: "mario@example.com",
        },
      } as any;

      currentSession.value = session;

      await expect(requireAuthenticatedSession()).resolves.toBe(session);
    });

    it("should throw UnauthorizedError for missing or invalid user ids", async () => {
      currentSession.value = null;
      await expect(requireAuthenticatedSession()).rejects.toBeInstanceOf(UnauthorizedError);

      currentSession.value = {
        user: {
          id: "NaN",
        },
      };
      await expect(requireAuthenticatedSession()).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("requireAuthenticatedUserId", () => {
    it("should return the user id for authenticated users", async () => {
      currentSession.value = {
        user: {
          id: "99",
        },
      };

      await expect(requireAuthenticatedUserId()).resolves.toBe(99);
    });

    it("should throw UnauthorizedError when the user is not authenticated", async () => {
      currentSession.value = null;

      await expect(requireAuthenticatedUserId()).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });
});
