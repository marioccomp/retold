import { prisma } from "../index";

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
};
