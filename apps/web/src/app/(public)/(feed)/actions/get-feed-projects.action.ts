"use server"

import { prisma } from "@repo/database"
import { ProjectCardDTO } from "@/src/domains/project/dtos/project-card.dto"

export async function getFeedProjects(): Promise<ProjectCardDTO[]> {
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
            }
        }
    })

    return projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        status: project.status,
        images: project.images,
        likes: 0, // TODO: implement likes count
        views: 0, // TODO: implement views count
        tags: project.tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
        })),
        createdAt: project.createdAt.toISOString(),
        ownerName: project.user.name || "",
        ownerImage: project.user.image || "",
        ownerUsername: project.user.username || "",
        repositoryUrl: project.repository?.url || undefined,
        repositoryFullName: project.repository?.fullName || undefined,
    }))
}
