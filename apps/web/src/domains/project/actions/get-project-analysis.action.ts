"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";

export async function getProjectAnalysisAction(projectId: number) {
    const session = await auth();
    const currentUserId = Number(session?.user.id);

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            analysis: true,
        },
    });

    if (!project) throw new Error("Project not found");

    if (project.visibility === "private" && project.userId !== currentUserId) {
        throw new Error("Unauthorized: Project is private");
    }

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
