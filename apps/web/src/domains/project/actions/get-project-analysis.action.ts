"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";

export async function getProjectAnalysisAction(projectId: number) {
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
