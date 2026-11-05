import "dotenv/config";
import { Worker } from "bullmq";
import { analyzeRepoQueue, redisConnection, userAnalyzeQueue } from "@repo/queue";
import "./user-worker";
import "./last-commit-worker";
import { cloneRepository } from "./clone";
import { prisma, githubRepository, Prisma } from "@repo/database";
import { createLogger } from "@repo/observability";
import { LlmAnalysisUnavailableError } from "./llm/analyze-project";
import { LlmRateLimitError } from "./llm/index.js";
import { buildLlmPrivacyDecision } from "./privacy.js";
import { runAnalysisPipeline } from "./pipeline.js";
import { markProjectAnalysisFailed } from "./analysis-failure.js";
import {
  PROJECT_ANALYSIS_TMP_ROOT,
  cleanupScopedDirectory,
  getProjectTempPath,
  parseProjectId,
  validateGitHubRepositoryUrl,
} from "./security.js";

const logger = createLogger("worker.project-analysis");

logger.info("worker.started");

const PROJECT_ANALYSIS_RETRY_JOB_ID_PREFIX = "project-analysis-retry-";

const worker = new Worker(
  "analyze-repo",
  async (job) => {
    const projectId = parseProjectId(job.data?.projectId);
    const locale =
      typeof job.data?.locale === "string" && job.data.locale.trim() ? job.data.locale : "en";
    const tmpPath = getProjectTempPath(PROJECT_ANALYSIS_TMP_ROOT, projectId);

    logger.info("worker.job_started", { projectId });

    try {
      const projectWithUser = await prisma.project.findUnique({
        where: { id: projectId },
        include: { user: true, repository: true },
      });

      if (!projectWithUser || !projectWithUser.user || !projectWithUser.repository) {
        throw new Error("Project, User or Repository not found");
      }

      if (projectWithUser.repository.userId !== projectWithUser.userId) {
        throw new Error("Repository ownership mismatch for project analysis");
      }

      const repositoryOrigin = validateGitHubRepositoryUrl(projectWithUser.repository.url);
      const llmPrivacyDecision = buildLlmPrivacyDecision({
        projectVisibility: projectWithUser.visibility,
        repositoryPrivate: projectWithUser.repository.private,
      });

      await prisma.project.update({
        where: { id: projectId },
        data: { status: "ANALYZING" },
      });

      let token = "";
      try {
        token = await githubRepository.getToken(projectId);
      } catch (e: any) {
        if (e.message.includes("No github installations found")) {
          logger.info("worker.github_installation_missing_public_clone", {
            projectId,
          });
        } else {
          throw e;
        }
      }

      logger.info("worker.repository_clone_started", { projectId });
      await cloneRepository(repositoryOrigin.normalizedUrl, tmpPath, token);
      logger.info("worker.repository_clone_completed", { projectId });

      // Trigger user analysis in parallel with the analysis pipeline.
      // Fire and forget - lets the user worker handle it async
      userAnalyzeQueue
        .add(
          "analyze-user",
          {
            projectId,
          },
          {
            jobId: `user-analysis-${projectId}`,
          }
        )
        .catch((error) =>
          logger.error("worker.user_analysis_queue_failed", error, {
            projectId,
            userId: projectWithUser.userId,
          })
        );

      const { analysis, preparedLlmAnalysis, llmInsights, tags: tagsToAssign } =
        await runAnalysisPipeline({
          repoPath: tmpPath,
          repoUrl: repositoryOrigin.normalizedUrl,
          repoName: repositoryOrigin.repo,
          title: projectWithUser.title,
          description: projectWithUser.description || undefined,
          locale,
          privacyDecision: llmPrivacyDecision,
          logContext: { projectId },
        });

      const llmInsightsJson = JSON.stringify(llmInsights);
      const persistedRawAnalysis = preparedLlmAnalysis.persistenceAnalysis as Prisma.InputJsonValue;

      await prisma.repositoryAnalysis.upsert({
        where: { projectId },
        create: {
          projectId,
          appType: analysis.summary.appType,
          stack: analysis.stack,
          structure: analysis.structure,
          signals: analysis.infra,
          rawAnalysis: persistedRawAnalysis,
          llmOverview: llmInsightsJson,
        },
        update: {
          appType: analysis.summary.appType,
          stack: analysis.stack,
          structure: analysis.structure,
          signals: analysis.infra,
          rawAnalysis: persistedRawAnalysis,
          llmOverview: llmInsightsJson,
        },
      });

      // Connect or create tags
      if (tagsToAssign.length > 0) {
        await prisma.project.update({
          where: { id: projectId },
          data: {
            tags: {
              connectOrCreate: tagsToAssign.map((tagName) => ({
                where: { name: tagName },
                create: { name: tagName },
              })),
            },
          },
        });
        logger.info("worker.tags_assigned", {
          projectId,
          tagCount: tagsToAssign.length,
          tags: tagsToAssign,
        });
      }

      await prisma.project.update({
        where: { id: projectId },
        data: { status: "DONE" },
      });

      // The daily quota was already reserved atomically at enqueue time.
      // On success we only clear temporary rate-limit state.
      const ownerProject = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true },
      });

      if (ownerProject) {
        await prisma.user.update({
          where: { id: ownerProject.userId },
          data: { rateLimitResetAt: null },
        });

        logger.info("worker.daily_analysis_reservation_committed", {
          projectId,
          userId: ownerProject.userId,
        });
      }
    } catch (err: any) {
      logger.error("worker.job_failed", err, { projectId });

      // Check if it's a rate limit error from Groq
      // Providers convert their own rate-limit errors into LlmRateLimitError
      // (analyzeProjectWithLLM rethrows it untouched).
      if (err instanceof LlmRateLimitError) {
        logger.warn("worker.rate_limit_detected", { projectId });

        // Wait what the provider asked for (at least 1s); 1h when it didn't say.
        const addMs = err.retryAfterMs !== null ? Math.max(err.retryAfterMs, 1000) : 3600 * 1000;

        const resetAt = new Date(Date.now() + addMs);

        logger.info("worker.rate_limit_window_parsed", {
          projectId,
          retryAfterMs: addMs,
          resetAt,
        });

        const retryJobId = `${PROJECT_ANALYSIS_RETRY_JOB_ID_PREFIX}${projectId}`;

        const existingRetryJob = await analyzeRepoQueue.getJob(retryJobId);
        if (existingRetryJob) {
          await existingRetryJob.remove();
        }

        // Find owner to lock
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { userId: true },
        });

        if (project) {
          await prisma.$transaction([
            prisma.user.update({
              where: { id: project.userId },
              data: { rateLimitResetAt: resetAt },
            }),
            prisma.project.update({
              where: { id: projectId },
              data: { status: "RATE_LIMITED" },
            }),
          ]);
          logger.warn("worker.user_rate_limited", {
            projectId,
            userId: project.userId,
            resetAt,
          });
        } else {
          await prisma.project.updateMany({
            where: { id: projectId },
            data: { status: "RATE_LIMITED" },
          });
        }

        await analyzeRepoQueue.add(
          "analyze",
          {
            projectId,
            locale,
          },
          {
            jobId: retryJobId,
            delay: addMs,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 5000,
            },
          }
        );

        logger.info("worker.retry_scheduled_after_rate_limit", {
          projectId,
          retryJobId,
          retryAfterMs: addMs,
          scheduledFor: resetAt,
        });

        return;
      }

      // BullMQ retries the job automatically while attempts remain. Only the final
      // attempt marks the project as failed and gives the reserved quota back, so a
      // single reservation is never released more than once.
      const maxAttempts = job.opts.attempts ?? 1;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

      if (!isFinalAttempt) {
        logger.warn("worker.job_will_retry", {
          projectId,
          attempt: job.attemptsMade + 1,
          maxAttempts,
        });
        throw err;
      }

      // The project is kept (never deleted): it moves to ERROR and the owner can
      // retry from the project panel after MANUAL_REANALYZE_COOLDOWN_MS.
      await markProjectAnalysisFailed(projectId, {
        reason: err instanceof LlmAnalysisUnavailableError ? err.code : "job_failed",
      });

      throw err;
    } finally {
      if (process.env.NODE_ENV === "production") {
        cleanupScopedDirectory(tmpPath, PROJECT_ANALYSIS_TMP_ROOT);
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
);

logger.info("worker.ready");
