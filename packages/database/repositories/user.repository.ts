import { prisma } from "../index";
import { Prisma } from "@prisma/client";
import { GithubStats, Plan, Role, User } from "@prisma/client";

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

export type SessionUserSnapshot = {
  id: number;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
  plan: Plan;
  username: string | null;
  password: string | null;
  hasCompletedOnboarding: boolean;
  sessionVersion: number;
};

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
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          password: passwordHash,
          sessionVersion: {
            increment: 1,
          },
        },
      });

      await tx.session.deleteMany({
        where: { userId },
      });

      return user;
    });
  },

  async findSessionSnapshotById(userId: number): Promise<SessionUserSnapshot | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        plan: true,
        username: true,
        password: true,
        hasCompletedOnboarding: true,
        sessionVersion: true,
      },
    });
  },
  async findPublicProfileByUsername(
    username: string,
    currentUserId?: number,
    projectsPage: number = 1,
    projectsLimit: number = 12,
    projectsQuery: string = "",
    projectsSort: "newest" | "oldest" | "popular" = "newest"
  ) {
    const skip = (projectsPage - 1) * projectsLimit;

    // Filter condition for projects
    const projectsWhereInput: any = {
      AND: [
        {
          OR: [
            {
              visibility: "public",
              status: { not: "PENDING" },
            },
            { userId: currentUserId },
          ],
        },
      ],
    };

    if (projectsQuery) {
      projectsWhereInput.AND.push({
        OR: [
          { title: { contains: projectsQuery, mode: "insensitive" } },
          {
            tags: {
              some: { name: { contains: projectsQuery, mode: "insensitive" } },
            },
          },
        ],
      });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        projects: {
          where: projectsWhereInput,
          orderBy:
            projectsSort === "popular"
              ? { views: "desc" }
              : projectsSort === "oldest"
                ? { createdAt: "asc" }
                : { createdAt: "desc" },
          skip,
          take: projectsLimit,
          include: {
            tags: true,
            repository: true,
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
        },
        _count: {
          select: {
            followers: true,
            following: true,
            projects: true, // This counts ALL projects, not filtered ones
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

    if (user) {
      // Correction of the count to always match the filters (visibility, repository, query)
      const filteredCount = await prisma.project.count({
        where: {
          userId: user.id,
          ...projectsWhereInput,
        },
      });
      (user as any)._count.projects = filteredCount;
    }

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
        _count: {
          select: {
            likes: true,
            comments: true,
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

  async searchUsers(
    query: string,
    currentUserId?: number,
    page: number = 1,
    limit: number = 20,
    sort: "active" | "newest" | "oldest" | "name" = "active"
  ) {
    const skip = (page - 1) * limit;

    // When searching, fall back to newest (ranking + text search don't mix well)
    const effectiveSort = query ? "newest" : sort;

    // Use raw SQL scoring for "active" sort
    if (effectiveSort === "active") {
      return this._getActiveUsers(currentUserId, page, limit);
    }

    // Normalize query for case-insensitive skill matching on scalar list
    const queryLower = query.toLowerCase();

    const whereClause: any = {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { username: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
        // Match users who have a skill containing the search query
        {
          skills: {
            hasSome: [
              query,
              queryLower,
              query.charAt(0).toUpperCase() + query.slice(1).toLowerCase(),
            ],
          },
        },
      ],
      ...(currentUserId ? { id: { not: currentUserId } } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          title: true,
          bio: true,
          cover: true,
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
        skip,
        take: limit,
        orderBy:
          sort === "name"
            ? { name: "asc" }
            : sort === "oldest"
              ? { createdAt: "asc" }
              : { createdAt: "desc" },
      }),
      prisma.user.count({
        where: whereClause,
      }),
    ]);

    return { users, total };
  },

  // ─── Activity-Based People Ranking ────────────────────────────────────────────
  // activity_score = (recent_projects_30d × 10) + (recent_likes_30d × 1)
  //                + (followers × 2) + profile_completeness_bonus

  async _getActiveUsers(currentUserId?: number, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const excludeClause = currentUserId ? Prisma.sql`AND u.id != ${currentUserId}` : Prisma.empty;

    // Get total count
    const [{ count: total }] = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count
      FROM "User" u
      WHERE u.username IS NOT NULL
      ${excludeClause}
    `;

    // Get scored user IDs
    const scoredIds = await prisma.$queryRaw<{ id: number }[]>`
      SELECT u.id
      FROM "User" u
      LEFT JOIN (
        SELECT "userId", COUNT(*)::int as cnt
        FROM "Project"
        WHERE "createdAt" > NOW() - INTERVAL '30 days' AND visibility = 'public'
        GROUP BY "userId"
      ) recent_projects ON u.id = recent_projects."userId"
      LEFT JOIN (
        SELECT "userId", COUNT(*)::int as cnt
        FROM "Like"
        WHERE "createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY "userId"
      ) recent_likes ON u.id = recent_likes."userId"
      LEFT JOIN (
        SELECT "followingId" as user_id, COUNT(*)::int as cnt
        FROM "Follows"
        GROUP BY "followingId"
      ) follower_count ON u.id = follower_count.user_id
      WHERE u.username IS NOT NULL
      ${excludeClause}
      ORDER BY (
        COALESCE(recent_projects.cnt, 0) * 10 +
        COALESCE(recent_likes.cnt, 0) * 1 +
        COALESCE(follower_count.cnt, 0) * 2 +
        CASE WHEN u.image IS NOT NULL THEN 5 ELSE 0 END +
        CASE WHEN u.bio IS NOT NULL THEN 3 ELSE 0 END +
        CASE WHEN array_length(u.skills, 1) > 0 THEN 2 ELSE 0 END +
        CASE WHEN EXISTS (
          SELECT 1 FROM "Project" WHERE "userId" = u.id AND visibility = 'public'
        ) THEN 5 ELSE 0 END
      ) DESC,
      u."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    if (scoredIds.length === 0) {
      return { users: [], total: Number(total) };
    }

    const ids = scoredIds.map((r) => r.id);

    // Fetch full user data with Prisma
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        title: true,
        bio: true,
        cover: true,
        skills: true,
        ...(currentUserId
          ? {
              followers: {
                where: { followerId: currentUserId },
                select: { followerId: true },
              },
            }
          : {}),
      },
    });

    // Preserve scored order
    const userMap = new Map(users.map((u) => [u.id, u]));
    const orderedUsers = ids.map((id) => userMap.get(id)).filter(Boolean);

    return { users: orderedUsers, total: Number(total) };
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
