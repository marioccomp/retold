"use server";

import { prisma } from "@repo/database";
import { ProjectStatus } from "@prisma/client";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { auth } from "@/src/domains/auth/auth";
import { unstable_cache } from "next/cache";

import { FEED_RECOMMENDED_TAG, ProjectSortType } from "./constants";

export async function getFeedProjects(
  page: number = 1,
  limit: number = 12,
  query: string = "",
  sort: ProjectSortType = "recommended"
): Promise<{
  projects: ProjectCardDTO[];
  metadata: { total: number; page: number; limit: number; totalPages: number };
}> {
  const session = await auth();
  const currentUserId = session?.user?.id ? Number(session.user.id) : null;

  // When searching, fall back to newest (ranking + text search don't mix well)
  const effectiveSort = query ? "newest" : sort;

  // Use raw SQL scoring for "recommended" sort
  if (effectiveSort === "recommended") {
    return getRecommendedFeed(page, limit, currentUserId);
  }

  // Standard Prisma query for other sorts
  const where = {
    visibility: "public",
    status: {
      in: [ProjectStatus.DONE, ProjectStatus.ANALYZING],
    },
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { description: { contains: query, mode: "insensitive" as const } },
            {
              tags: {
                some: {
                  name: { contains: query, mode: "insensitive" as const },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [total, projects] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy:
        effectiveSort === "popular"
          ? { views: "desc" }
          : effectiveSort === "oldest"
            ? { createdAt: "asc" }
            : { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
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
            id: true,
            name: true,
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
    }),
  ]);

  const mappedProjects = projects.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    visibility: project.visibility,
    images: project.images,
    featuredTagIds: project.featuredTagIds,
    likes: project._count.likes,
    views: project.views,
    commentsCount: project._count.comments,
    hasLiked: project.likes && project.likes.length > 0,
    tags: project.tags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
    })),
    createdAt: project.createdAt.toISOString(),
    ownerName: project.user.name || "",
    ownerImage: project.user.image || "",
    ownerUsername: project.user.username || "",
    ownerId: project.user.id,
    isFollowingOwner: (project.user as any).followers?.length > 0,
    repositoryUrl: project.repository?.url || undefined,
    repositoryFullName: project.repository?.fullName || undefined,
    repositoryIsPrivate: project.repository?.private ?? false,
  }));

  return {
    projects: mappedProjects,
    metadata: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Recommended Feed with Hybrid Scoring ─────────────────────────────────────
// Score = engagement / (age + 2)^gravity
// engagement = (recent_likes_7d × 5) + (recent_views_7d × 0.5) + (total_likes × 2) + (total_views × 0.1)
// gravity = 1.5

// Cached scoring function — rankings stay stable for 30 seconds
const getCachedScoredIds = unstable_cache(
  async (page: number, limit: number) => {
    const offset = (page - 1) * limit;

    const [{ count: total }] = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count
      FROM "Project" p
      WHERE p.visibility = 'public' AND p.status IN ('DONE', 'ANALYZING')
    `;

    const scoredIds = await prisma.$queryRaw<{ id: number }[]>`
      SELECT p.id
      FROM "Project" p
      LEFT JOIN (
        SELECT "projectId", COUNT(*)::int as cnt
        FROM "Like" WHERE "createdAt" > NOW() - INTERVAL '7 days'
        GROUP BY "projectId"
      ) recent_likes ON p.id = recent_likes."projectId"
      LEFT JOIN (
        SELECT "projectId", COUNT(*)::int as cnt
        FROM "ProjectView" WHERE "createdAt" > NOW() - INTERVAL '7 days'
        GROUP BY "projectId"
      ) recent_views ON p.id = recent_views."projectId"
      LEFT JOIN (
        SELECT "projectId", COUNT(*)::int as cnt
        FROM "Like" GROUP BY "projectId"
      ) total_likes ON p.id = total_likes."projectId"
      WHERE p.visibility = 'public' AND p.status IN ('DONE', 'ANALYZING')
      ORDER BY (
        (COALESCE(recent_likes.cnt, 0) * 5) +
        (COALESCE(recent_views.cnt, 0) * 0.5) +
        (COALESCE(total_likes.cnt, 0) * 2) +
        (p.views * 0.1)
      ) / POWER(EXTRACT(EPOCH FROM (NOW() - p."createdAt")) / 3600 + 2, 1.5) DESC,
      p."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return { total: Number(total), ids: scoredIds.map((r) => r.id) };
  },
  [FEED_RECOMMENDED_TAG],
  { revalidate: 30 } // 30 seconds
);

async function getRecommendedFeed(
  page: number,
  limit: number,
  currentUserId: number | null
): Promise<{
  projects: ProjectCardDTO[];
  metadata: { total: number; page: number; limit: number; totalPages: number };
}> {
  // Get cached scoring (order frozen for 5 min)
  const { total, ids } = await getCachedScoredIds(page, limit);

  if (ids.length === 0) {
    return {
      projects: [],
      metadata: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Fetch full project data with Prisma for the scored IDs
  const projects = await prisma.project.findMany({
    where: { id: { in: ids } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          ...(currentUserId
            ? {
                followers: {
                  where: { followerId: currentUserId },
                  select: { followerId: true },
                },
              }
            : {}),
        },
      },
      tags: {
        select: { id: true, name: true },
      },
      repository: {
        select: { url: true, fullName: true, private: true },
      },
      _count: {
        select: { likes: true, comments: true },
      },
      ...(currentUserId
        ? {
            likes: {
              where: { userId: currentUserId },
              select: { userId: true },
            },
          }
        : {}),
    },
  });

  // Preserve the scored order from the raw query
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const orderedProjects = ids.map((id) => projectMap.get(id)).filter(Boolean) as typeof projects;

  const mappedProjects = orderedProjects.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    visibility: project.visibility,
    images: project.images,
    featuredTagIds: project.featuredTagIds,
    likes: project._count.likes,
    views: project.views,
    commentsCount: project._count.comments,
    hasLiked: project.likes && project.likes.length > 0,
    tags: project.tags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
    })),
    createdAt: project.createdAt.toISOString(),
    ownerName: project.user.name || "",
    ownerImage: project.user.image || "",
    ownerUsername: project.user.username || "",
    ownerId: project.user.id,
    isFollowingOwner: (project.user as any).followers?.length > 0,
    repositoryUrl: project.repository?.url || undefined,
    repositoryFullName: project.repository?.fullName || undefined,
    repositoryIsPrivate: project.repository?.private ?? false,
  }));

  return {
    projects: mappedProjects,
    metadata: {
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    },
  };
}
