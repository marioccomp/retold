"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { getUserRepositories } from "@/src/domains/github/github";
import { startProjectAnalysisAction } from "./start-project-analysis.action";
import { ActionResponse } from "@/lib/action-response";
import { Project } from "@prisma/client";
import { getDictionary } from "@/src/i18n/server";
import { postGithubStats } from "@/src/app/(public)/[username]/_actions/post-github-stats.action";
import { lastCommitQueue } from "@repo/queue";
// import { analyzeRepoQueue } from "@repo/queue";

type CreateProjectInput = {
  title: string;
  description: string;
  visibility: "public" | "private";
  repositoryId: number;
};

export async function createProjectAction(
  input: CreateProjectInput
): Promise<ActionResponse<Project>> {
  const session = await auth();
  const dict = await getDictionary();
  const t = dict.project.create_panel.toast;

  await getUserRepositories();

  if (!session?.user?.id) {
    return { success: false, message: dict.auth.errors.unauthorized };
  }

  // Check rate limit
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { rateLimitResetAt: true }
  });

  if (user?.rateLimitResetAt && user.rateLimitResetAt > new Date()) {
    const diff = user.rateLimitResetAt.getTime() - Date.now();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return {
      success: false,
      message: `Limite de análises atingido. Tente novamente em ${minutes}m ${seconds}s.`
    };
  }

  const existingProject = await prisma.project.findFirst({
    where: { repositoryId: input.repositoryId },
  });

  if (existingProject) {
    return { success: false, message: t.already_exists };
  }

  const repository = await prisma.repository.findFirst({
    where: {
      id: input.repositoryId,
      userId: Number(session.user.id),
      isActive: true,
    },
  });

  if (!repository) {
    return { success: false, message: t.repo_not_found };
  }

  const project = await prisma.project.create({
    data: {
      title: input.title,
      description: input.description,
      longerDescription: input.description,
      images: [],
      userId: Number(session.user.id),
      repositoryId: repository.id,
      status: "PENDING",
    },
  });

  const projectId = project.id;

  await postGithubStats(session.user.username || "");

  await lastCommitQueue.add(
    "refresh-last-commit",
    { userId: Number(session.user.id) },
    {
      jobId: `lastCommit-${session.user.id}`,
      removeOnComplete: true,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
    }
  );

  await startProjectAnalysisAction(projectId);

  return { success: true, data: project };
}
