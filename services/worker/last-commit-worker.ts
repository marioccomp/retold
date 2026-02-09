import { githubRepository, prisma, Prisma } from "@repo/database";
import { Octokit } from "octokit";
import { Worker } from "bullmq";
import { redisConnection } from "@repo/queue";

type JobData = {
  userId: number;
};

console.log("last-commit-worker starting");

export const lastCommitWorker = new Worker(
  "github-last-commit",
  async (job) => {
    const { userId } = job.data as JobData;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        githubInstallations: true,
        projects: { include: { repository: true } },
      },
    });

    const publicRepos = user?.projects.filter((p) => p.repository?.private === false);

    if (!user || user.githubInstallations.length === 0) {
      console.log("no installations or user not found");
      return;
    }

    const githubLogin = user?.githubInstallations[0].accountLogin;

    const token = await githubRepository.getTokenByUserId(userId);

    const octokit = new Octokit({ auth: token });

    const repoFullNames = publicRepos
      ?.map((p) => p.repository?.fullName)
      .filter(Boolean) as string[];

    if (repoFullNames.length === 0) {
      console.log("No repos, saving null lastCommit");
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
        console.log(`failed repo ${fullName}`);
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

    console.log("[last-commit-worker] updated lastCommit", best?.repo ?? null);
    console.log(best || "nada");
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);
