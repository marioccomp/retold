import { beforeEach, describe, expect, it, vi } from "vitest";

const { findSessionSnapshotById, loggerError } = vi.hoisted(() => ({
  findSessionSnapshotById: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  userRepository: {
    findSessionSnapshotById,
  },
}));

vi.mock("@repo/observability", () => ({
  createLogger: () => ({
    error: loggerError,
  }),
}));

import { authConfig } from "./auth.config";

describe("authConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("callbacks.jwt", () => {
    it("should hydrate the token with a fresh session snapshot", async () => {
      findSessionSnapshotById.mockResolvedValue({
        id: 7,
        email: "mario@example.com",
        name: "Mario",
        image: "avatar.webp",
        role: "ADMIN",
        plan: "PREMIUM",
        username: "mario",
        password: "hashed",
        hasCompletedOnboarding: true,
        sessionVersion: 3,
      });

      const result = await authConfig.callbacks.jwt({
        token: {},
        user: {
          id: "7",
          authenticatedAt: 1234,
        } as any,
      } as any);

      expect(result).toEqual(
        expect.objectContaining({
          id: "7",
          email: "mario@example.com",
          name: "Mario",
          image: "avatar.webp",
          picture: "avatar.webp",
          role: "ADMIN",
          plan: "PREMIUM",
          username: "mario",
          hasCompletedOnboarding: true,
          hasPassword: true,
          sessionVersion: 3,
          authenticatedAt: 1234,
        })
      );
      expect(findSessionSnapshotById).toHaveBeenCalledWith(7);
    });

    it("should return null when the session version changed", async () => {
      findSessionSnapshotById.mockResolvedValue({
        id: 7,
        email: "mario@example.com",
        name: "Mario",
        image: null,
        role: "USER",
        plan: "FREE",
        username: "mario",
        password: "hashed",
        hasCompletedOnboarding: false,
        sessionVersion: 9,
      });

      const result = await authConfig.callbacks.jwt({
        token: {
          id: "7",
          sessionVersion: 3,
        },
      } as any);

      expect(result).toBeNull();
    });

    it("should return null when the token id is invalid or the snapshot is missing", async () => {
      const invalidResult = await authConfig.callbacks.jwt({
        token: {
          id: "abc",
        },
      } as any);

      expect(invalidResult).toBeNull();

      findSessionSnapshotById.mockResolvedValue(null);
      const missingResult = await authConfig.callbacks.jwt({
        token: {
          id: "7",
        },
      } as any);

      expect(missingResult).toBeNull();
    });

    it("should log and return null when the repository throws", async () => {
      findSessionSnapshotById.mockRejectedValue(new Error("database down"));

      const result = await authConfig.callbacks.jwt({
        token: {
          id: "5",
        },
      } as any);

      expect(result).toBeNull();
      expect(loggerError).toHaveBeenCalledWith(
        "auth.jwt_sync_failed",
        expect.any(Error),
        expect.objectContaining({ userId: "5" })
      );
    });
  });

  describe("callbacks.session", () => {
    it("should hydrate the session user from the token", async () => {
      const result = await authConfig.callbacks.session({
        session: {
          user: {
            email: "old@example.com",
            name: "Old",
            image: null,
          },
        },
        token: {
          id: "11",
          email: "new@example.com",
          name: "New Name",
          image: "avatar.webp",
          username: "new-user",
          hasCompletedOnboarding: false,
          authenticatedAt: 999,
        },
      } as any);

      expect(result.user).toEqual(
        expect.objectContaining({
          id: "11",
          email: "new@example.com",
          name: "New Name",
          image: "avatar.webp",
          username: "new-user",
          hasCompletedOnboarding: false,
          authenticatedAt: 999,
        })
      );
    });
  });

  describe("callbacks.authorized", () => {
    it("should redirect authenticated users without username to choose-username", () => {
      const result = authConfig.callbacks.authorized({
        auth: {
          user: {
            role: "USER",
            plan: "FREE",
            username: null,
            hasCompletedOnboarding: true,
          },
        },
        request: {
          nextUrl: new URL("http://localhost:3000/settings"),
        },
      } as any);

      expect(result).toBeInstanceOf(Response);
      expect((result as Response).headers.get("location")).toBe(
        "http://localhost:3000/choose-username"
      );
    });

    it("should redirect authenticated users without onboarding to /onboarding", () => {
      const result = authConfig.callbacks.authorized({
        auth: {
          user: {
            role: "USER",
            plan: "FREE",
            username: "mario",
            hasCompletedOnboarding: false,
          },
        },
        request: {
          nextUrl: new URL("http://localhost:3000/settings"),
        },
      } as any);

      expect(result).toBeInstanceOf(Response);
      expect((result as Response).headers.get("location")).toBe(
        "http://localhost:3000/onboarding"
      );
    });

    it("should allow public routes even when the user still needs setup", () => {
      const result = authConfig.callbacks.authorized({
        auth: {
          user: {
            role: "USER",
            plan: "FREE",
            username: null,
            hasCompletedOnboarding: false,
          },
        },
        request: {
          nextUrl: new URL("http://localhost:3000/login"),
        },
      } as any);

      expect(result).toBe(true);
    });

    it("should enforce plan and role based routes", () => {
      expect(
        authConfig.callbacks.authorized({
          auth: {
            user: {
              role: "USER",
              plan: "FREE",
              username: "mario",
              hasCompletedOnboarding: true,
            },
          },
          request: {
            nextUrl: new URL("http://localhost:3000/premium"),
          },
        } as any)
      ).toBe(false);

      expect(
        authConfig.callbacks.authorized({
          auth: {
            user: {
              role: "RECRUITER",
              plan: "PREMIUM",
              username: "mario",
              hasCompletedOnboarding: true,
            },
          },
          request: {
            nextUrl: new URL("http://localhost:3000/recruiter"),
          },
        } as any)
      ).toBe(true);

      expect(
        authConfig.callbacks.authorized({
          auth: {
            user: {
              role: "ADMIN",
              plan: "PREMIUM",
              username: "mario",
              hasCompletedOnboarding: true,
            },
          },
          request: {
            nextUrl: new URL("http://localhost:3000/admin"),
          },
        } as any)
      ).toBe(true);
    });
  });
});
