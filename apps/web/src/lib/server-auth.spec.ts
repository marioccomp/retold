import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/domains/auth/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/src/domains/auth/auth";
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
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "42",
        },
      } as any);

      await expect(getAuthenticatedUserId()).resolves.toBe(42);
    });

    it("should return null when the session is missing or invalid", async () => {
      vi.mocked(auth).mockResolvedValue(null);
      await expect(getAuthenticatedUserId()).resolves.toBeNull();

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "not-a-number",
        },
      } as any);
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

      vi.mocked(auth).mockResolvedValue(session);

      await expect(requireAuthenticatedSession()).resolves.toBe(session);
    });

    it("should throw UnauthorizedError for missing or invalid user ids", async () => {
      vi.mocked(auth).mockResolvedValue(null);
      await expect(requireAuthenticatedSession()).rejects.toBeInstanceOf(UnauthorizedError);

      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "NaN",
        },
      } as any);
      await expect(requireAuthenticatedSession()).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("requireAuthenticatedUserId", () => {
    it("should return the user id for authenticated users", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "99",
        },
      } as any);

      await expect(requireAuthenticatedUserId()).resolves.toBe(99);
    });

    it("should throw UnauthorizedError when the user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      await expect(requireAuthenticatedUserId()).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });
});
