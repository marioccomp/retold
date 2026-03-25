import { prisma } from "@repo/database";
import { auth } from "../../auth/auth";

export const projectRepository = {
  async getProjectById(id: number) {
    const session = await auth();
    const currentUserId = Number(session?.user.id);

    const project = await prisma.project.findUnique({
      where: {
        id,
      },
      include: {
        user: {
          select: {
            name: true,
            username: true,
            image: true,
            id: true,
            ...(currentUserId
              ? {
                  followers: {
                    where: {
                      followerId: currentUserId,
                    },
                    select: {
                      followerId: true,
                    },
                  },
                }
              : {}),
          },
        },
        tags: {
          select: {
            name: true,
            id: true,
          },
        },
        repository: {
          select: {
            url: true,
            fullName: true,
            private: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        ...(currentUserId
          ? {
              likes: {
                where: {
                  userId: currentUserId,
                },
                select: {
                  userId: true,
                },
              },
            }
          : {}),
      },
    });

    if (project && project.visibility === "private" && project.userId !== currentUserId) {
      throw new Error("Unauthorized: Project is private");
    }

    return project;
  },
  async getFollowsMe(anotherUserId: number) {
    const session = await auth();
    const currentUserId = Number(session?.user.id);

    // quero percorrer a lista de followings do anotherUserId e verificar se o currentUserId está entre os followers de cada um

    const user = await prisma.user.findUnique({
      where: {
        id: anotherUserId,
      },
      include: {
        following: true,
      },
    });

    if (!user) {
      return [];
    }
    const followsMe = user.following.some((follow) => follow.followingId === currentUserId);

    return followsMe;
  },
  async getUserFollowings(userId: number) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        following: true,
      },
    });

    if (!user) {
      return [];
    }

    return user.following;
  },
};
