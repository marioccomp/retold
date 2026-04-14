import { Worker } from "bullmq";
import { redisConnection } from "@repo/queue";
import {
  prisma,
  githubRepository,
  matchesUserCommitAuthor,
  resolveUserCommitIdentity,
} from "@repo/database";
import { execFileSync } from "child_process";
import { cloneRepository } from "./clone";
import { createLogger } from "@repo/observability";
import {
  USER_ANALYSIS_TMP_ROOT,
  cleanupScopedDirectory,
  getProjectTempPath,
  parseProjectId,
  validateGitHubRepositoryUrl,
} from "./security.js";

const logger = createLogger("worker.user-analysis");

logger.info("worker.started");

export const userWorker = new Worker(
  "user-analyze",
  async (job) => {
    const projectId = parseProjectId(job.data?.projectId);
    const tmpPath = getProjectTempPath(USER_ANALYSIS_TMP_ROOT, projectId);

    logger.info("worker.job_started", { projectId });

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          repository: true,
          user: {
            include: {
              accounts: {
                where: { provider: "github" },
                select: { providerAccountId: true },
              },
              githubInstallations: {
                select: { accountLogin: true, accountType: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!project) throw new Error("Project not found");

      if (project.visibility === "private") {
        logger.info("worker.private_project_skipped", { projectId });
        return;
      }

      if (project.repository && project.repository.userId !== project.userId) {
        throw new Error("Repository ownership mismatch for user analysis");
      }

      const repoUrl = project.repository?.url;
      if (!repoUrl) {
        logger.info("worker.repository_missing", { projectId });
        return;
      }
      const repositoryOrigin = validateGitHubRepositoryUrl(repoUrl);

      let token = "";
      try {
        token = await githubRepository.getToken(projectId);
      } catch (error: any) {
        if (error.message.includes("No github installations found")) {
          logger.info("worker.github_installation_missing_public_clone", { projectId });
        } else {
          throw error;
        }
      }

      await cloneRepository(repositoryOrigin.normalizedUrl, tmpPath, token);

      const personalGithubInstallation = project.user.githubInstallations[0];
      const githubAccount = project.user.accounts[0];
      const commitIdentity = resolveUserCommitIdentity({
        email: project.user.email,
        githubEmail: project.user.githubEmail,
        username: project.user.username,
        name: project.user.name,
        githubUrl: project.user.githubUrl,
        githubLogin:
          personalGithubInstallation?.accountType === "User"
            ? personalGithubInstallation.accountLogin
            : null,
        githubAccountId: githubAccount?.providerAccountId ?? null,
      });

      const logOutput = execFileSync(
        "git",
        ["-C", tmpPath, "log", "--format=%aE%x1f%aN%x1f%cd"],
        {
          encoding: "utf8",
        }
      );
      const commits = logOutput.split("\n").filter(Boolean);

      let userCommitsCount = 0;
      let firstCommit: string | null = null;
      let lastCommit: string | null = null;
      const daysActive = new Set<string>();

      for (const line of commits) {
        const [email, authorName, dateStr] = line.split("\x1f");
        if (
          matchesUserCommitAuthor(
            {
              email,
              name: authorName,
            },
            commitIdentity
          )
        ) {
          userCommitsCount++;
          const dateObj = new Date(dateStr);

          if (!lastCommit) lastCommit = dateStr;
          firstCommit = dateStr;

          const dayKey = dateObj.toISOString().split("T")[0];
          daysActive.add(dayKey);
        }
      }

      let linesAdded = 0;
      let linesDeleted = 0;

      try {
        const numstatOutput = execFileSync(
          "git",
          ["-C", tmpPath, "log", "--all", "--numstat", "--pretty=%aE%x1f%aN"],
          {
            encoding: "utf8",
          }
        );
        const numstatLines = numstatOutput.split("\n");

        let isUserCommit = false;

        for (const line of numstatLines) {
          if (!line.trim()) continue;

          if (line.includes("\x1f")) {
            const [email, authorName] = line.split("\x1f");
            isUserCommit = matchesUserCommitAuthor(
              {
                email,
                name: authorName,
              },
              commitIdentity
            );
          } else if (isUserCommit) {
            const parts = line.split("\t");
            if (parts.length >= 2) {
              const add = parseInt(parts[0]);
              const del = parseInt(parts[1]);
              if (!isNaN(add)) linesAdded += add;
              if (!isNaN(del)) linesDeleted += del;
            }
          }
        }
      } catch (error) {
        logger.warn("worker.numstat_calculation_failed", { projectId }, error);
      }

      logger.info("worker.stats_calculated", {
        projectId: project.id,
        userId: project.userId,
        commitsCount: userCommitsCount,
        linesAdded,
        linesDeleted,
        activeDays: daysActive.size,
      });

      await prisma.userProjectStats.upsert({
        where: {
          userId_projectId: {
            userId: project.userId,
            projectId,
          },
        },
        create: {
          userId: project.userId,
          projectId,
          commitsCount: userCommitsCount,
          linesAdded,
          linesDeleted,
          activeDays: daysActive.size,
          firstCommitDate: firstCommit ? new Date(firstCommit) : null,
          lastCommitDate: lastCommit ? new Date(lastCommit) : null,
          impactScore: (linesAdded - linesDeleted) * 0.01 + userCommitsCount,
        },
        update: {
          commitsCount: userCommitsCount,
          linesAdded,
          linesDeleted,
          activeDays: daysActive.size,
          firstCommitDate: firstCommit ? new Date(firstCommit) : null,
          lastCommitDate: lastCommit ? new Date(lastCommit) : null,
          impactScore: (linesAdded - linesDeleted) * 0.01 + userCommitsCount,
        },
      });
    } catch (err) {
      logger.error("worker.job_failed", err, { projectId });
    } finally {
      cleanupScopedDirectory(tmpPath, USER_ANALYSIS_TMP_ROOT);
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
);
