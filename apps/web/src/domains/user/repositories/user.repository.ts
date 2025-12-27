import { prisma } from "@repo/database";

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
      },
    });

    return user;
  },
};
