"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { analyzeRepoQueue } from "@repo/queue";

import { getAnalysisLocale } from "@/src/i18n/server";

import { DAILY_ANALYSIS_LIMIT } from "../constants";

export async function startProjectAnalysisAction(projectId: number) {
  const session = await auth();
  const locale = await getAnalysisLocale();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = Number(session.user.id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { rateLimitResetAt: true, dailyAnalysisCount: true, dailyAnalysisDate: true },
  });

  if (!user) throw new Error("User not found");

  if (user.rateLimitResetAt && user.rateLimitResetAt > new Date()) {
    const diff = user.rateLimitResetAt.getTime() - Date.now();
    const hoursLeft = Math.floor(diff / 3600000);
    const minutesLeft = Math.floor((diff % 3600000) / 60000);

    return {
      queued: false,
      limitReached: true,
      remaining: 0,
      limit: DAILY_ANALYSIS_LIMIT,
      hoursLeft,
      minutesLeft,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDate = user.dailyAnalysisDate ? new Date(user.dailyAnalysisDate) : null;
  const isToday = lastDate && lastDate.getTime() >= today.getTime();
  const currentCount = isToday ? user.dailyAnalysisCount : 0;

  if (currentCount >= DAILY_ANALYSIS_LIMIT) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const msUntilReset = tomorrow.getTime() - Date.now();
    const hoursLeft = Math.floor(msUntilReset / 3600000);
    const minutesLeft = Math.floor((msUntilReset % 3600000) / 60000);

    return {
      queued: false,
      limitReached: true,
      remaining: 0,
      limit: DAILY_ANALYSIS_LIMIT,
      hoursLeft,
      minutesLeft,
    };
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      userId: userId,
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
      locale: locale,
    },
    {
      jobId: `project-analysis-${project.id}`,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    }
  );

  return {
    queued: true,
    projectId: project.id,
    remaining: DAILY_ANALYSIS_LIMIT - currentCount - 1,
    limit: DAILY_ANALYSIS_LIMIT,
  };
}
