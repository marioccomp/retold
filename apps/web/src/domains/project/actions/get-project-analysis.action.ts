"use server";

import { getAuthenticatedUserId } from "@/src/lib/server-auth";
import { prisma } from "@repo/database";

import { requireProjectAccess } from "../lib/project-access";

export async function getProjectAnalysisAction(projectId: number) {
    const currentUserId = await getAuthenticatedUserId();
    await requireProjectAccess(projectId, currentUserId);

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            analysis: true,
        },
    });

    if (!project) throw new Error("Project not found");

    return {
        status: project.status,
        analysis: project.analysis
            ? {
                ...project.analysis,
                createdAt: project.analysis.createdAt.toISOString(),
            }
            : null,
    };
}
