"use server";

import { prisma } from "@repo/database";
import { projectRepository } from "@/src/domains/project/repository/project.repository";
import { mapProjectToProjectDTO } from "@/src/domains/project/mapper/project-to-project-dto.mapper";
import { unstable_cache } from "next/cache";

// Função interna para buscar o ID, que será cacheada
const getCachedHighlightedId = unstable_cache(
  async () => {
    const bestProjects = await prisma.$queryRaw<[{ id: number }]>`
        SELECT p.id
        FROM "Project" p
        LEFT JOIN "Repository" r ON p."repositoryId" = r.id
        LEFT JOIN (
            SELECT "projectId", COUNT(*)::int as like_count 
            FROM "Like" 
            GROUP BY "projectId"
        ) l ON p.id = l."projectId"
        WHERE p.status = 'DONE' 
          AND array_length(p.images, 1) > 0
          AND p.visibility = 'public'
          AND r.private = false
        ORDER BY (COALESCE(l.like_count, 0) * 5) + p.views DESC
        LIMIT 1
    `;
    return bestProjects[0]?.id || null;
  },
  ["highlighted-project-id"],
  { revalidate: 3600, tags: ["projects"] } // 1 hora de cache
);

export async function getHighlightedProject() {
  const bestProjectId = await getCachedHighlightedId();

  if (!bestProjectId) {
    return null;
  }

  const project = await projectRepository.getProjectById(bestProjectId);

  if (!project) {
    return null;
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
      private: project.repository?.private,
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

  return projectDTO;
}
