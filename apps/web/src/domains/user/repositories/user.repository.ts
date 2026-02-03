export { userRepository } from "@repo/database";
import { prisma } from "@repo/database";
import { User } from "@repo/database";

type UpdatableProfileFields = Pick<User, "name" | "username" | "bio" | "title" | "githubUrl" | "linkedinUrl" | "websiteUrl" | "longBio" | "skills" | "phone" | "email" | "contactEmail">;
// Input type for updating profile fields
type UpdateProfileInput = Partial<UpdatableProfileFields>;

const userRepository = {
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
  findPublicProfileByUsername(username: string, currentUserId?: number) {
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
            ...(currentUserId ? {
              likes: {
                where: {
                  userId: currentUserId,
                },
                select: {
                  userId: true,
                },
              }
            } : {}),
          },
        },
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
        ...(currentUserId ? {
          followers: {
            where: {
              followerId: currentUserId,
            },
            select: {
              followerId: true,
            }
          }
        } : {}),
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

  async updateProfileDetails(userId: number, data: {
    longBio?: string | null;
    skills?: string[];
    educations?: { degree: string; institution: string; startDate: Date; endDate: Date | null }[];
  }) {
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
            data: data.educations.map(edu => ({
              ...edu,
              userId,
            })),
          });
        }
      }

      return user;
    });
  },

  searchUsers(query: string, currentUserId?: number) {
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
        cover: true,
        skills: true,
        ...(currentUserId ? {
          followers: {
            where: {
              followerId: currentUserId,
            },
            select: {
              followerId: true,
            }
          }
        } : {}),
      },
      take: 20,
    });
  },
};
