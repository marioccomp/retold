"use server"

import { projectRepository } from "@/src/domains/profile/repositories/project.repository"
import { mapProjectToProjectDTO } from "@/src/domains/project/mapper/project-to-project-dto.mapper"

export async function getHighlightedProject() {
    const project = await projectRepository.getHighlightedProject()

    if (!project) {
        return null
    }

    const projectDTO = mapProjectToProjectDTO({
        project: project!,
        user: {
            name: project.user.name!,
            image: project.user.image!,
            username: project.user.username!,
        },
        repository: {
            url: project.repository?.url || "",
            fullName: project.repository?.fullName || ""
        },
        tags: project.tags.map((tag) => ({
            name: tag.name,
            id: tag.id,
        })),
        likes: 10,
        views: 15,
    });

    return projectDTO
}
