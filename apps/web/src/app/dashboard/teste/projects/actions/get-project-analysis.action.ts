"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";

export async function getProjectAnalysisAction(projectId: number) {
  const session = await auth();

  if (!session?.user?.id) throw new Error("Unauthorized");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      analysis: true,
    },
  });

  if (project?.userId !== Number(session.user.id)) throw new Error("Unauthorized");

  if (!project) throw new Error("Project not found");

  console.log(project.status);
  console.log(project.analysis?.rawAnalysis);

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
