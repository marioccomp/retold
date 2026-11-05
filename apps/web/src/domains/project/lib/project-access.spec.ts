import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/database", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@repo/database";
import { canAccessProject, requireProjectAccess } from "./project-access";

describe("project-access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canAccessProject", () => {
    it("should allow access to public projects for any user", () => {
      expect(canAccessProject({ userId: 1, visibility: "public" }, undefined)).toBe(true);
      expect(canAccessProject({ userId: 1, visibility: "public" }, 2)).toBe(true);
    });

    it("should allow access to private projects only for the owner", () => {
      expect(canAccessProject({ userId: 10, visibility: "private" }, 10)).toBe(true);
      expect(canAccessProject({ userId: 10, visibility: "private" }, 11)).toBe(false);
      expect(canAccessProject({ userId: 10, visibility: "private" }, null)).toBe(false);
    });
  });

  describe("requireProjectAccess", () => {
    it("should return the project access context when the user can access it", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 5,
        userId: 12,
        visibility: "public",
      } as any);

      await expect(requireProjectAccess(5, 99)).resolves.toEqual({
        id: 5,
        userId: 12,
        visibility: "public",
      });
    });

    it("should throw PROJECT_NOT_FOUND when the project does not exist", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

      await expect(requireProjectAccess(123, 1)).rejects.toEqual(
        expect.objectContaining({
          code: "PROJECT_NOT_FOUND",
        })
      );
    });

    it("should throw PROJECT_NOT_ACCESSIBLE for private projects owned by another user", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 15,
        userId: 50,
        visibility: "private",
      } as any);

      await expect(requireProjectAccess(15, 51)).rejects.toEqual(
        expect.objectContaining({
          code: "PROJECT_NOT_ACCESSIBLE",
        })
      );
    });

    it("should allow collaborators and invited users to access a private project", async () => {
      for (const status of ["ACCEPTED", "PENDING"]) {
        vi.mocked(prisma.project.findUnique).mockResolvedValue({
          id: 15,
          userId: 50,
          visibility: "private",
          collaborators: [{ status }],
        } as any);

        await expect(requireProjectAccess(15, 51)).resolves.toEqual({
          id: 15,
          userId: 50,
          visibility: "private",
        });
      }
    });

    it("should only look up membership for signed-in users", async () => {
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 15,
        userId: 50,
        visibility: "private",
      } as any);

      await expect(requireProjectAccess(15, null)).rejects.toEqual(
        expect.objectContaining({ code: "PROJECT_NOT_ACCESSIBLE" })
      );
      expect(vi.mocked(prisma.project.findUnique).mock.calls[0][0].select).not.toHaveProperty(
        "collaborators"
      );
    });
  });
});
