import { Worker } from "bullmq";
import { redisConnection } from "@repo/queue";
import { prisma, githubRepository, resolveUserCommitIdentity } from "@repo/database";
import { execFileSync } from "child_process";
import { cloneRepository } from "./clone";
import {
  buildContributionLogArgs,
  ContributionMember,
  parseTeamContributionLog,
} from "./contribution-stats.js";
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

/** Fields needed to resolve a member's commit identity. */
const memberIdentitySelect = {
  id: true,
  email: true,
  githubEmail: true,
  username: true,
  name: true,
  githubUrl: true,
  accounts: {
    where: { provider: "github" },
    select: { providerAccountId: true },
  },
  githubInstallations: {
    select: { accountLogin: true, accountType: true },
    take: 1,
  },
} as const;

type MemberIdentitySource = {
  id: number;
  email: string;
  githubEmail: string | null;
  username: string | null;
  name: string | null;
  githubUrl: string | null;
  accounts: { providerAccountId: string }[];
  githubInstallations: { accountLogin: string; accountType: string }[];
};

function toContributionMember(user: MemberIdentitySource): ContributionMember<number> {
  const personalGithubInstallation = user.githubInstallations[0];
  const identity = resolveUserCommitIdentity({
    email: user.email,
    githubEmail: user.githubEmail,
    username: user.username,
    name: user.name,
    githubUrl: user.githubUrl,
    githubLogin:
      personalGithubInstallation?.accountType === "User"
        ? personalGithubInstallation.accountLogin
        : null,
    githubAccountId: user.accounts[0]?.providerAccountId ?? null,
  });

  return { id: user.id, emails: identity.candidateEmails, names: identity.candidateNames };
}

/**
 * Recomputes contribution stats for every member of a project (owner + accepted
 * collaborators) from the repository history. Idempotent: safe to run again at
 * any time (after a push, a new member, a re-analysis...).
 */
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
          user: { select: memberIdentitySelect },
          collaborators: {
            where: { status: "ACCEPTED" },
            select: { user: { select: memberIdentitySelect } },
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

      // The owner's installation token is used for the clone, for every member.
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

      await cloneRepository(repositoryOrigin.normalizedUrl, tmpPath, token, "history");

      const members = [project.user, ...project.collaborators.map((c) => c.user)].map(
        toContributionMember
      );

      // One log invocation for commits AND lines (same scope, no merges), on the
      // full default-branch history (the clone is not shallow). Each commit is
      // credited to at most one member.
      const logOutput = execFileSync("git", buildContributionLogArgs(tmpPath), {
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
      });
      const statsByMember = parseTeamContributionLog(logOutput, members);

      for (const [userId, stats] of statsByMember) {
        const { commitsCount, linesAdded, linesDeleted, activeDates } = stats;

        logger.info("worker.stats_calculated", {
          projectId,
          userId,
          isOwner: userId === project.userId,
          commitsCount,
          linesAdded,
          linesDeleted,
          activeDays: activeDates.length,
        });

        const statsData = {
          commitsCount,
          linesAdded,
          linesDeleted,
          activeDays: activeDates.length,
          activeDates,
          firstCommitDate: stats.firstCommitDate,
          lastCommitDate: stats.lastCommitDate,
          impactScore: (linesAdded - linesDeleted) * 0.01 + commitsCount,
        };

        await prisma.userProjectStats.upsert({
          where: { userId_projectId: { userId, projectId } },
          create: { userId, projectId, ...statsData },
          update: statsData,
        });
      }
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
