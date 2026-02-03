import { prisma } from "../index";
import { GithubStats, User } from "@prisma/client";

type UpdatableProfileFields = Pick<
  User,
  | "name"
  | "username"
  | "bio"
  | "title"
  | "githubUrl"
  | "linkedinUrl"
  | "websiteUrl"
  | "longBio"
  | "skills"
  | "phone"
  | "email"
  | "contactEmail"
>;
type UpdateProfileInput = Partial<UpdatableProfileFields>;

export const userRepository = {
  async findByEmailOrUsername(email: string, username: string) {
    return prisma.user.findFirst({
      where: {
        OR: [{ email: email }, { username: username }],
      },
    });
  },

  async create(data: { name: string; email: string; username: string; password: string }) {
    return prisma.user.create({ data });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email: email,
      },
    });
  },

  async findByUsername(username: string) {
    return prisma.user.findUnique({
      where: {
        username: username,
      },
    });
  },

  async updatePassword(userId: number, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });
  },
  async findPublicProfileByUsername(username: string, currentUserId?: number) {
    const user = prisma.user.findUnique({
      where: { username },
      include: {
        projects: {
          orderBy: { createdAt: "desc" },
          include: {
            tags: true,
            repository: true,
            _count: {
              select: {
                likes: true,
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
        },
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
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
        educations: {
          orderBy: { startDate: "desc" },
        },
        userStats: true,
        githubStats: true,
      },
    });

    return user;
  },

  async updateProfileById(userId: number, data: UpdateProfileInput) {
    if (Object.keys(data).length === 0) {
      throw new Error("No fields to update");
    }

    return prisma.user.update({
      where: { id: userId },
      data,
    });
  },

  async getUserInstallationId(userId: number) {
    const installation = prisma.githubAppInstallation.findFirst({
      where: { userId },
    });

    return installation;
  },

  async deleteAllUserInstallationId(userId: number) {
    return prisma.githubAppInstallation.deleteMany({
      where: { userId },
    });
  },

  async getAllUserProjects(userId: number) {
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

  async updateProfileDetails(
    userId: number,
    data: {
      longBio?: string | null;
      skills?: string[];
      educations?: { degree: string; institution: string; startDate: Date; endDate: Date | null }[];
    }
  ) {
    return prisma.$transaction(async (tx) => {
      // Update user fields if provided
      const updateData: any = {};
      if (data.longBio !== undefined) updateData.longBio = data.longBio;
      if (data.skills !== undefined) updateData.skills = data.skills;

      let user;
      if (Object.keys(updateData).length > 0) {
        user = await tx.user.update({
          where: { id: userId },
          data: updateData,
        });
      } else {
        user = await tx.user.findUnique({ where: { id: userId } });
      }

      // Sync educations ONLY IF provided in the call
      if (data.educations !== undefined) {
        await tx.education.deleteMany({
          where: { userId },
        });

        if (data.educations.length > 0) {
          await tx.education.createMany({
            data: data.educations.map((edu) => ({
              ...edu,
              userId,
            })),
          });
        }
      }

      return user;
    });
  },

  async searchUsers(query: string, currentUserId?: number) {
    return prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { username: { contains: query, mode: "insensitive" } },
          { title: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        title: true,
        bio: true,
        skills: true,
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
      take: 20,
    });
  },

  async createOrUpdateGithubStats(userId: number, data: any) {
    return await prisma.githubStats.upsert({
      where: { userId },
      update: data,
      create: {
        ...data,
        userId,
      },
    });
  },

  async getGithubStatsById(userId: number) {
    return await prisma.githubStats.findUnique({
      where: { userId },
    });
  },

  async getGithubStatsByUsername(username: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        githubStats: true,
      },
    });

    if (!user) return null;
    return user.githubStats || null;
  },
};
