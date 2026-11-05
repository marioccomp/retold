import { prisma } from "@repo/database";
import { lastCommitQueue, userAnalyzeQueue } from "@repo/queue";

/**
 * Handling of GitHub `push` webhooks.
 *
 * The webhook does NOT count commits or lines itself. Incrementing counters from
 * push payloads was wrong in several ways: every commit was credited to the owner
 * of the installation (whoever authored it), pushes to any branch were counted
 * (and counted again when the branch was merged), and GitHub redeliveries were
 * double-counted with no way to self-correct.
 *
 * Instead, a push to the default branch schedules a full recalculation of each
 * linked project's stats from `git log` (user-worker). The recalculation is
 * idempotent and filters commits by author, so redeliveries and other authors'
 * commits are harmless. Jobs are debounced: a burst of pushes produces one run,
 * STATS_RECALC_DEBOUNCE_MS after the last push.
 */

export const STATS_RECALC_DEBOUNCE_MS = 5 * 60 * 1000;

export type PushWebhookPayload = {
  ref?: string;
  repository?: {
    id?: number;
    default_branch?: string;
  };
  commits?: unknown[];
};

export type PushWebhookResult =
  | { processed: false; reason: string }
  | { processed: true; projectIds: number[]; userIds: number[] };

export function isDefaultBranchPush(payload: PushWebhookPayload) {
  const defaultBranch = payload.repository?.default_branch;
  return Boolean(defaultBranch && payload.ref === `refs/heads/${defaultBranch}`);
}

export async function handlePushEvent(payload: PushWebhookPayload): Promise<PushWebhookResult> {
  const githubRepositoryId = payload.repository?.id;

  if (typeof githubRepositoryId !== "number") {
    return { processed: false, reason: "missing_repository" };
  }

  if (!payload.commits || payload.commits.length === 0) {
    return { processed: false, reason: "no_commits" };
  }

  if (!isDefaultBranchPush(payload)) {
    return { processed: false, reason: "not_default_branch" };
  }

  // Every Retold user who linked this repository (each one has their own project).
  const linkedProjects = await prisma.project.findMany({
    where: {
      repository: { githubId: githubRepositoryId, isActive: true },
    },
    select: { id: true, userId: true, visibility: true },
  });

  if (linkedProjects.length === 0) {
    return { processed: false, reason: "no_linked_projects" };
  }

  // Private projects are excluded from contribution stats (same rule as user-worker).
  const publicProjects = linkedProjects.filter((project) => project.visibility !== "private");
  const userIds = [...new Set(linkedProjects.map((project) => project.userId))];

  await Promise.all([
    ...publicProjects.map((project) =>
      userAnalyzeQueue.add(
        "analyze-user",
        { projectId: project.id },
        {
          delay: STATS_RECALC_DEBOUNCE_MS,
          // Debounce: while the job is still delayed, a new push replaces it and
          // restarts the timer. After it starts, the next push schedules a new run.
          deduplication: {
            id: `push-stats-${project.id}`,
            ttl: STATS_RECALC_DEBOUNCE_MS,
            extend: true,
            replace: true,
          },
        }
      )
    ),
    ...userIds.map((userId) =>
      lastCommitQueue.add(
        "refresh-last-commit",
        { userId },
        {
          delay: STATS_RECALC_DEBOUNCE_MS,
          deduplication: {
            id: `push-last-commit-${userId}`,
            ttl: STATS_RECALC_DEBOUNCE_MS,
            extend: true,
            replace: true,
          },
          attempts: 3,
          backoff: { type: "exponential", delay: 30_000 },
        }
      )
    ),
  ]);

  return {
    processed: true,
    projectIds: publicProjects.map((project) => project.id),
    userIds,
  };
}
