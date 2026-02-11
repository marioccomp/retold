"use server";

import { prisma } from "@repo/database";
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto";
import { auth } from "@/src/domains/auth/auth";

export async function getFeedProjects(
  page: number = 1,
  limit: number = 12,
  query: string = ""
): Promise<{
  projects: ProjectCardDTO[];
  metadata: { total: number; page: number; limit: number; totalPages: number };
}> {
  const session = await auth();
  const currentUserId = session?.user?.id ? Number(session.user.id) : null;

  const where = {
    visibility: "public",
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
      orderBy: { createdAt: "desc" },
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
    likes: project._count.likes,
    views: project.views,
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
