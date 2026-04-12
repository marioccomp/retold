"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { analyzeRepoQueue } from "@repo/queue";

import { getAnalysisLocale } from "@/src/i18n/server";

import { DAILY_ANALYSIS_LIMIT, MANUAL_REANALYZE_COOLDOWN_MS } from "../constants";
import {
  getCurrentAnalysisQuota,
  releaseDailyAnalysisQuotaReservation,
  reserveDailyAnalysisQuota,
} from "../lib/analysis-quota";

export type StartProjectAnalysisActionResult =
  | {
      queued: true;
      projectId: number;
      remaining: number;
      limit: number;
      alreadyQueued?: true;
    }
  | {
      queued: false;
      limitReached: true;
      remaining: 0;
      limit: number;
      hoursLeft: number;
      minutesLeft: number;
    }
  | {
      queued: false;
      retryBlocked: true;
      minutesLeft: number;
      retryAvailableAt: string;
    };

export async function startProjectAnalysisAction(
  projectId: number
): Promise<StartProjectAnalysisActionResult> {
  const session = await auth();
  const locale = await getAnalysisLocale();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = Number(session.user.id);

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

  if (project.status === "ERROR") {
    const retryAvailableAt = new Date(project.updatedAt.getTime() + MANUAL_REANALYZE_COOLDOWN_MS);
    const now = new Date();

    if (retryAvailableAt > now) {
      const diffMs = retryAvailableAt.getTime() - now.getTime();
      const minutesLeft = Math.ceil(diffMs / 60_000);

      return {
        queued: false,
        retryBlocked: true,
        minutesLeft,
        retryAvailableAt: retryAvailableAt.toISOString(),
      };
    }
  }

  if (project.status === "ANALYZING") {
    const quota = await getCurrentAnalysisQuota(userId);

    return {
      queued: true,
      projectId: project.id,
      remaining: quota.remaining,
      limit: quota.limit,
      alreadyQueued: true,
    };
  }

  const quotaReservation = await reserveDailyAnalysisQuota(userId);

  if (!quotaReservation.reserved) {
    return {
      queued: false,
      limitReached: true,
      remaining: 0,
      limit: DAILY_ANALYSIS_LIMIT,
      hoursLeft: quotaReservation.hoursLeft,
      minutesLeft: quotaReservation.minutesLeft,
    };
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "ANALYZING" },
  });

  try {
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
  } catch (error) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "PENDING" },
    });
    await releaseDailyAnalysisQuotaReservation(userId);
    throw error;
  }

  return {
    queued: true,
    projectId: project.id,
    remaining: quotaReservation.remaining,
    limit: quotaReservation.limit,
  };
}
