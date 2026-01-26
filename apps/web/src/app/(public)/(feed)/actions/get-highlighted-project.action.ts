"use server"

import { projectRepository } from "@/src/domains/project/repository/project.repository"
import { mapProjectToProjectDTO } from "@/src/domains/project/mapper/project-to-project-dto.mapper"

export async function getHighlightedProject() {
    const project = await projectRepository.getHighlightedProject()

    if (!project) {
        return null
    }

    const projectDTO = mapProjectToProjectDTO({
        project: project!,
        user: {
            id: project.user.id,
            name: project.user.name!,
            image: project.user.image!,
            username: project.user.username!,
        },
        repository: {
            url: project.repository?.url || "",
            fullName: project.repository?.fullName || "",
            private: project.repository?.private
        },
        tags: project.tags.map((tag) => ({
            name: tag.name,
            id: tag.id,
        })),
        likes: project._count.likes,
        views: project.views,
        hasLiked: project.likes && project.likes.length > 0,
        isFollowingOwner: (project.user as any).followers?.length > 0,
    });

    return projectDTO
}
