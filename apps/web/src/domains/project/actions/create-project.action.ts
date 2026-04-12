"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { getUserRepositories } from "@/src/domains/github/github";
import {
  StartProjectAnalysisActionResult,
  startProjectAnalysisAction,
} from "./start-project-analysis.action";
import { getDictionary } from "@/src/i18n/server";
import { postGithubStats } from "@/src/app/(public)/[username]/_actions/post-github-stats.action";
import { lastCommitQueue } from "@repo/queue";
import { revalidatePath, revalidateTag } from "next/cache";
import { FEED_RECOMMENDED_TAG } from "@/src/app/(public)/(feed)/actions/constants";

type CreateProjectInput = {
  title: string;
  description: string;
  visibility: "public" | "private";
  repositoryId: number;
};

export type CreateProjectActionResponse =
  | {
      success: true;
      data: { id: number };
      analysisStatus: "queued";
      remaining: number;
      limit: number;
    }
  | {
      success: true;
      data: { id: number };
      analysisStatus: "quota_blocked";
      hoursLeft: number;
      minutesLeft: number;
      limit: number;
    }
  | {
      success: true;
      data: { id: number };
      analysisStatus: "enqueue_failed";
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export async function createProjectAction(
  input: CreateProjectInput
): Promise<CreateProjectActionResponse> {
  const session = await auth();
  const dict = await getDictionary();
  const t = dict.project.create_panel.toast;

  if (!session?.user?.id) {
    return { success: false, message: dict.auth.errors.unauthorized };
  }

  const userId = Number(session.user.id);
  const now = new Date();
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { rateLimitResetAt: true },
  });

  if (currentUser?.rateLimitResetAt && currentUser.rateLimitResetAt > now) {
    const diff = currentUser.rateLimitResetAt.getTime() - now.getTime();
    const hoursLeft = Math.floor(diff / 3_600_000);
    const minutesLeft = Math.floor((diff % 3_600_000) / 60_000);
    const timeStr =
      hoursLeft > 0
        ? dict.project.analysis.retry_time_hours
            .replace("{hours}", String(hoursLeft))
            .replace("{minutes}", String(minutesLeft))
        : dict.project.analysis.retry_time_minutes.replace("{minutes}", String(minutesLeft));

    return {
      success: false,
      message: t.internal_error_cooldown.replace("{time}", timeStr),
    };
  }

  await getUserRepositories();

  const repository = await prisma.repository.findFirst({
    where: {
      id: input.repositoryId,
      userId,
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
      userId,
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
      { userId },
      {
        jobId: `lastCommit-${userId}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 30_000 },
      }
    )
    .catch((error) => {
      console.error("Failed to enqueue last commit refresh after project creation", {
        userId,
        projectId,
        error,
      });
    });

  let analysisStart:
    | StartProjectAnalysisActionResult
    | { queued: false; limitReached: false };

  try {
    analysisStart = await startProjectAnalysisAction(projectId);
  } catch (error) {
    console.error("Failed to start analysis after project creation", {
      userId,
      projectId,
      error,
    });
    analysisStart = { queued: false, limitReached: false };
  }

  // @ts-expect-error - documentation says single arg, but types seem to differ in this version
  revalidateTag(FEED_RECOMMENDED_TAG);
  revalidatePath("/");

  if (analysisStart.queued) {
    return {
      success: true,
      data: { id: project.id },
      analysisStatus: "queued",
      remaining: analysisStart.remaining,
      limit: analysisStart.limit,
    };
  }

  if ("limitReached" in analysisStart && analysisStart.limitReached) {
    return {
      success: true,
      data: { id: project.id },
      analysisStatus: "quota_blocked",
      hoursLeft: analysisStart.hoursLeft ?? 0,
      minutesLeft: analysisStart.minutesLeft ?? 0,
      limit: analysisStart.limit,
    };
  }

  return {
    success: true,
    data: { id: project.id },
    analysisStatus: "enqueue_failed",
  };
}
