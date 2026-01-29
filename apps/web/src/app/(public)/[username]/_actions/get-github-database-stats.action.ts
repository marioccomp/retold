import { prisma, userRepository } from "@repo/database";
import { lastCommitQueue } from "@repo/queue";

// const TTL_MS = 24 * 60 * 60 * 1000;
const TTL_MS = 20000;

export async function getGithubDatabaseStats(username: string) {
  const stats = await userRepository.getGithubStatsByUsername(username);

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return stats;

  const fetchedAt = stats?.lastCommitFetchedAt ? new Date(stats.lastCommitFetchedAt) : null;
  const stale = !fetchedAt || Date.now() - fetchedAt.getTime() > TTL_MS;

  if (stale) {
    await lastCommitQueue.add(
      "refresh-last-commit",
      { userId: user.id },
      {
        jobId: `lastCommit-${user.id}`,
        removeOnComplete: true,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: "exponential", delay: 30_000 },
      }
    );
  }

  return stats;
}
