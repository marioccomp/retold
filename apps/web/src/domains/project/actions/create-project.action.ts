"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { getUserRepositories } from "@/src/domains/github/github";
import { startProjectAnalysisAction } from "./start-project-analysis.action";
import { DAILY_ANALYSIS_LIMIT } from "../constants";
import { ActionResponse } from "@/lib/action-response";
import { getDictionary } from "@/src/i18n/server";
import { postGithubStats } from "@/src/app/(public)/[username]/_actions/post-github-stats.action";
import { lastCommitQueue } from "@repo/queue";
import { revalidatePath, revalidateTag } from "next/cache";
import { FEED_RECOMMENDED_TAG } from "@/src/app/(public)/(feed)/actions/constants";
// import { analyzeRepoQueue } from "@repo/queue";
type CreateProjectInput = {
  title: string;
  description: string;
  visibility: "public" | "private";
  repositoryId: number;
};

export async function createProjectAction(
  input: CreateProjectInput
): Promise<ActionResponse<{ id: number }>> {
  const session = await auth();
  const dict = await getDictionary();
  const t = dict.project.create_panel.toast;

  if (!session?.user?.id) {
    return { success: false, message: dict.auth.errors.unauthorized };
  }

  await getUserRepositories();

  // Check rate limit
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { rateLimitResetAt: true, dailyAnalysisCount: true, dailyAnalysisDate: true },
  });

  if (user?.rateLimitResetAt && user.rateLimitResetAt > new Date()) {
    const diff = user.rateLimitResetAt.getTime() - Date.now();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return {
      success: false,
      message: `Limite de análises atingido. Tente novamente em ${minutes}m ${seconds}s.`,
    };
  }

  // Check daily analysis limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastDate = user?.dailyAnalysisDate ? new Date(user.dailyAnalysisDate) : null;
  const isToday = lastDate && lastDate.getTime() >= today.getTime();
  const currentCount = isToday ? (user?.dailyAnalysisCount ?? 0) : 0;

  if (currentCount >= DAILY_ANALYSIS_LIMIT) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const msUntilReset = tomorrow.getTime() - Date.now();
    const hoursLeft = Math.floor(msUntilReset / 3600000);
    const minutesLeft = Math.floor((msUntilReset % 3600000) / 60000);

    const timeStr =
      hoursLeft > 0
        ? dict.project.analysis.retry_time_hours
            .replace("{hours}", String(hoursLeft))
            .replace("{minutes}", String(minutesLeft))
        : dict.project.analysis.retry_time_minutes.replace("{minutes}", String(minutesLeft));

    return {
      success: false,
      message: `${dict.project.analysis.limit_reached_description} ${timeStr}`,
    };
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

  const existingProject = await prisma.project.findFirst({
    where: { repositoryId: repository.id },
  });

  if (existingProject) {
    return { success: false, message: t.already_exists };
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
      visibility: input.visibility,
    },
  });


  const projectId = project.id;

  await postGithubStats();

  void lastCommitQueue
    .add(
      "refresh-last-commit",
      { userId: Number(session.user.id) },
      {
        jobId: `lastCommit-${session.user.id}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 30_000 },
      }
    )
    .catch((error) => {
      console.error("Failed to enqueue last commit refresh after project creation", {
        userId: Number(session.user.id),
        projectId,
        error,
      });
    });


  await startProjectAnalysisAction(projectId);


  // Calculate remaining analyses for notification
  const remaining = DAILY_ANALYSIS_LIMIT - currentCount - 1;

  // @ts-expect-error - documentation says single arg, but types seem to differ in this version
  revalidateTag(FEED_RECOMMENDED_TAG);
  revalidatePath("/");

  return {
    success: true,
    data: { id: project.id },
    remaining,
    limit: DAILY_ANALYSIS_LIMIT,
  };
}
