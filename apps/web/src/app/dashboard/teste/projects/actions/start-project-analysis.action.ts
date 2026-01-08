"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { analyzeRepoQueue } from "@repo/queue";

export async function startProjectAnalysisAction(projectId: number) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      userId: Number(session.user.id),
    },
    include: {
      repository: true,
    },
  });

  if (!project) throw new Error("Project not found");

  if (!project.repository?.url) throw new Error("Repository URL not found");

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "ANALYZING" },
  });

  await analyzeRepoQueue.add(
    "analyze",
    {
      projectId: project.id,
      repoUrl: project.repository.url,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true,
    }
  );

  return {
    queued: true,
    projectId: project.id,
    repoUrl: project.repository.url,
  };
}
