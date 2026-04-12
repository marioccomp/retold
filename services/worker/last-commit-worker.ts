import { githubRepository, prisma, Prisma } from "@repo/database";
import { Octokit } from "octokit";
import { Worker } from "bullmq";
import { redisConnection } from "@repo/queue";
import { createLogger } from "@repo/observability";
import { parsePositiveSafeInteger } from "./security.js";

type JobData = {
  userId: number;
};

const logger = createLogger("worker.last-commit");

logger.info("worker.started");

export const lastCommitWorker = new Worker(
  "github-last-commit",
  async (job) => {
    const userId = parsePositiveSafeInteger((job.data as JobData | undefined)?.userId, "userId");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        githubInstallations: true,
        projects: { include: { repository: true } },
      },
    });

    if (!user || user.githubInstallations.length === 0) {
      logger.info("worker.user_without_installation", { userId });
      return;
    }

    const githubLogin = user?.githubInstallations[0].accountLogin;

    const token = await githubRepository.getTokenByUserId(userId);

    const octokit = new Octokit({ auth: token });

    const repoFullNames = Array.from(
      new Set(
        (user.projects ?? [])
          .map((project) => project.repository?.fullName)
          .filter(Boolean) as string[]
      )
    );

    if (repoFullNames.length === 0) {
      logger.info("worker.no_project_repositories", { userId });
      await prisma.githubStats.upsert({
        where: { userId },
        update: { lastCommit: Prisma.DbNull, lastCommitFetchedAt: new Date() },
        create: {
          userId,
          lastCommit: Prisma.DbNull,
          lastCommitFetchedAt: new Date(),
          totalStars: 0,
          totalRepositories: 0,
          totalPRs: 0,
          topLanguages: [],
        },
      });
      return;
    }

    let best: { date: string; message: string; repo: string } | null = null;
    let failedRepos = 0;

    for (const fullName of repoFullNames) {
      const [owner, repo] = fullName.split("/");
      if (!owner || !repo) continue;

      try {
        const res = await octokit.rest.repos.listCommits({
          owner,
          repo,
          author: githubLogin,
          per_page: 1,
        });

        const commit = res.data?.[0];
        const date = commit?.commit?.author?.date;
        const message = commit?.commit?.message;

        if (!date || !message) continue;

        if (!best || new Date(date).getTime() > new Date(best.date).getTime()) {
          best = { date, message, repo: fullName };
        }
      } catch (e) {
        failedRepos += 1;
      }
    }

    await prisma.githubStats.upsert({
      where: { userId },
      update: {
        lastCommit: best ?? Prisma.DbNull,
        lastCommitFetchedAt: new Date(),
      },
      create: {
        userId,
        lastCommit: best ?? Prisma.DbNull,
        lastCommitFetchedAt: new Date(),
        totalStars: 0,
        totalRepositories: 0,
        totalPRs: 0,
        topLanguages: [],
      },
    });

    if (failedRepos > 0) {
      logger.warn("worker.repository_commit_lookup_partial_failure", {
        userId,
        failedRepos,
        repositoryCount: repoFullNames.length,
      });
    }

    logger.info("worker.last_commit_updated", {
      userId,
      repositoryCount: repoFullNames.length,
      hasLastCommit: Boolean(best),
      lastCommitDate: best?.date ?? null,
    });
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);
