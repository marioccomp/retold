import { prisma } from "@repo/database";
import { User } from "@repo/database";

type UpdatableProfileFields = Pick<User, "name" | "username" | "bio" | "title">;
type UpdateProfileInput = Partial<UpdatableProfileFields>;

export const userRepository = {
  findByEmailOrUsername(email: string, username: string) {
    return prisma.user.findFirst({
      where: {
        OR: [{ email: email }, { username: username }],
      },
    });
  },

  create(data: { name: string; email: string; username: string; password: string }) {
    return prisma.user.create({ data });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email: email,
      },
    });
  },

  findByUsername(username: string) {
    return prisma.user.findUnique({
      where: {
        username: username,
      },
    });
  },

  updatePassword(userId: number, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });
  },
  findPublicProfileByUsername(username: string) {
    const user = prisma.user.findUnique({
      where: { username },
      include: {
        projects: {
          orderBy: { createdAt: "desc" },
          include: {
            tags: true,
          },
        },
        certifications: {
          orderBy: { createdAt: "desc" },
          include: {
            tags: true,
          },
        },
        participations: {
          orderBy: { createdAt: "desc" },
          include: {
            tags: true,
          },
        },
      },
    });

    return user;
  },

  updateProfileById(userId: number, data: UpdateProfileInput) {
    if (Object.keys(data).length === 0) {
      throw new Error("No fields to update");
    }

    return prisma.user.update({
      where: { id: userId },
      data,
    });
  },

  getUserInstallationId(userId: number) {
    const installation = prisma.githubAppInstallation.findFirst({
      where: { userId },
    });

    return installation;
  },

  deleteAllUserInstallationId(userId: number) {
    return prisma.githubAppInstallation.deleteMany({
      where: { userId },
    });
  },

  getAllUserProjects(userId: number) {
    return prisma.project.findMany({
      where: {
        userId: userId,
      },
      include: {
        repository: {
          select: {
            id: true,
            fullName: true,
            url: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },
};
