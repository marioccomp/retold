import { prisma, userRepository } from "@repo/database";
import { lastCommitQueue } from "@repo/queue";

const TTL_MS = 24 * 60 * 60 * 1000;
// const TTL_MS = 20000;

export async function getGithubDatabaseStats(username: string) {
  const stats = await userRepository.getGithubStatsByUsername(username);

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      _count: {
        select: {
          projects: true,
        },
      },
    },
  });
  if (!user) return stats;
  if (user._count.projects === 0) return stats;

  const fetchedAt = stats?.lastCommitFetchedAt ? new Date(stats.lastCommitFetchedAt) : null;
  const stale = !fetchedAt || Date.now() - fetchedAt.getTime() > TTL_MS;

  if (stale) {
    void lastCommitQueue
      .add(
        "refresh-last-commit",
        { userId: user.id },
        {
          jobId: `lastCommit-${user.id}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 30_000 },
        }
      )
      .catch((error) => {
        console.error("Failed to enqueue last commit refresh", {
          username,
          userId: user.id,
          error,
        });
      });
  }

  return stats;
}
