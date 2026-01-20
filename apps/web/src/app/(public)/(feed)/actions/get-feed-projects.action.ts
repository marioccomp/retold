"use server"

import { prisma } from "@repo/database"
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto"
import { auth } from "@/src/domains/auth/auth"

export async function getFeedProjects(): Promise<ProjectCardDTO[]> {
    const session = await auth()
    const currentUserId = session?.user?.id ? Number(session.user.id) : null

    const projects = await prisma.project.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    ...(currentUserId ? {
                        followers: {
                            where: {
                                followerId: currentUserId
                            },
                            select: {
                                followerId: true
                            }
                        }
                    } : {})
                }
            },
            tags: {
                select: {
                    id: true,
                    name: true,
                }
            },
            repository: {
                select: {
                    url: true,
                    fullName: true,
                }
            },
            _count: {
                select: {
                    likes: true
                }
            },
            ...(currentUserId ? {
                likes: {
                    where: {
                        userId: currentUserId
                    },
                    select: {
                        userId: true
                    }
                }
            } : {})
        }
    })

    return projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        status: project.status,
        images: project.images,
        likes: project._count.likes,
        views: project.views,
        hasLiked: project.likes && project.likes.length > 0,
        tags: project.tags.map((tag) => ({
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
    }))
}
