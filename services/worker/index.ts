import "dotenv/config";
import { Worker } from "bullmq";
import { analyzeRepoQueue, redisConnection, userAnalyzeQueue } from "@repo/queue";
import "./user-worker";
import "./last-commit-worker";
import { cloneRepository } from "./clone";
import { prisma, githubRepository, Prisma } from "@repo/database";
import { createLogger } from "@repo/observability";
import { analyzeProjectWithLLM } from "./llm/analyze-project";
import { analyzeRepository } from "./analyze/index";
import { buildLlmPrivacyDecision, prepareAnalysisForLlm } from "./privacy.js";
import {
  PROJECT_ANALYSIS_TMP_ROOT,
  cleanupScopedDirectory,
  getProjectTempPath,
  parseProjectId,
  tryReadRepositoryTextFile,
  validateGitHubRepositoryUrl,
} from "./security.js";

const logger = createLogger("worker.project-analysis");

function readRepositoryReadme(repoPath: string, maxChars = 30_000) {
  const possibleReadmePaths = ["README.md", "readme.md", "README.MD"];
  for (const fileName of possibleReadmePaths) {
    try {
      const content = tryReadRepositoryTextFile(repoPath, fileName, maxChars);
      if (content !== null) {
        return content;
      }
    } catch (error) {
      logger.warn("worker.repository_readme_blocked", { readmeName: fileName }, error);
    }
  }
  return "";
}

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
      const readmeContent = readRepositoryReadme(tmpPath);

      logger.info("worker.repository_analysis_started", { projectId });
      const analysis = await analyzeRepository(tmpPath, {
        readme: readmeContent,
        repoUrl: repositoryOrigin.normalizedUrl,
        includeCodeSamples: llmPrivacyDecision.includeCodeSamples,
      });
      logger.info("worker.repository_analysis_completed", {
        projectId,
        totalFiles: analysis.stats.totalFiles,
        frameworkCount: analysis.stack.frameworks.length,
        languageCount: analysis.stack.languages.length,
        codeSamplesCount: analysis.codeSamples?.length ?? 0,
      });

      const repoName = repositoryOrigin.repo;
      const preparedLlmAnalysis = prepareAnalysisForLlm(
        {
          ...analysis,
          readme: readmeContent,
          codeSamples: analysis.codeSamples,
          locale,
        },
        llmPrivacyDecision
      );

      logger.info("worker.llm_privacy_mode_selected", {
        projectId,
        mode: llmPrivacyDecision.mode,
        projectSensitivity: llmPrivacyDecision.projectSensitivity,
        externalLlmAllowed: llmPrivacyDecision.externalLlmAllowed,
        includeReadme: llmPrivacyDecision.includeReadme,
        includeCodeSamples: llmPrivacyDecision.includeCodeSamples,
        redactionsApplied: preparedLlmAnalysis.redactionsApplied,
      });

      // Trigger user analysis in parallel with LLM processing
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

      const llmInsights = await analyzeProjectWithLLM(
        preparedLlmAnalysis.promptAnalysis,
        repoName,
        projectWithUser.title,
        projectWithUser.description || undefined,
        llmPrivacyDecision
      );
      const llmSummaryParagraphs = Array.isArray(
        (llmInsights as { summary?: { paragraphs?: unknown[] } }).summary?.paragraphs
      )
        ? (llmInsights as { summary?: { paragraphs?: unknown[] } }).summary?.paragraphs?.length ?? 0
        : 0;
      const llmSuggestions: unknown[] = Array.isArray(
        (llmInsights as { suggestions?: unknown[] }).suggestions
      )
        ? (llmInsights as { suggestions?: unknown[] }).suggestions ?? []
        : [];

      logger.info("worker.llm_analysis_completed", {
        projectId,
        hasError: Boolean((llmInsights as { error?: unknown }).error),
        summaryParagraphs: llmSummaryParagraphs,
        suggestionCount: llmSuggestions.length,
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

      // Extract tags from analysis (max 4 tags)
      const tagsToAssign: string[] = [];

      // Primary language
      if (analysis.summary.primaryLanguage && analysis.summary.primaryLanguage !== "unknown") {
        tagsToAssign.push(analysis.summary.primaryLanguage);
      }

      // Prioritized framework selection
      if (analysis.stack.frameworks && Array.isArray(analysis.stack.frameworks)) {
        // Priority tiers: backend/main frameworks > frontend frameworks > SDKs/tools
        const highPriority = [
          "NestJS",
          "Express",
          "FastAPI",
          "Django",
          "Flask",
          "AdonisJS",
          "Next.js",
          "Nuxt.js",
          "Rails",
        ];
        const mediumPriority = [
          "React Native",
          "React",
          "Vue",
          "Angular",
          "Svelte",
          "Flutter",
          "Spring Boot",
          "Laravel",
        ];
        const lowPriority = ["Expo", "Electron"]; // SDKs/runners that are less important as tags

        const sortedFrameworks = [...analysis.stack.frameworks].sort((a, b) => {
          const getPriority = (fw: string) => {
            if (highPriority.includes(fw)) return 0;
            if (mediumPriority.includes(fw)) return 1;
            if (lowPriority.includes(fw)) return 2;
            return 1; // default to medium
          };
          return getPriority(a) - getPriority(b);
        });

        for (const fw of sortedFrameworks) {
          if (tagsToAssign.length < 4) tagsToAssign.push(fw);
        }
      }

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

      // Increment daily analysis counter only on SUCCESS
      const ownerProject = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true },
      });

      if (ownerProject) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const owner = await prisma.user.findUnique({
          where: { id: ownerProject.userId },
          select: { dailyAnalysisCount: true, dailyAnalysisDate: true },
        });

        const lastDate = owner?.dailyAnalysisDate ? new Date(owner.dailyAnalysisDate) : null;
        const isToday = lastDate && lastDate.getTime() >= today.getTime();

        await prisma.user.update({
          where: { id: ownerProject.userId },
          data: {
            dailyAnalysisCount: isToday ? (owner?.dailyAnalysisCount ?? 0) + 1 : 1,
            dailyAnalysisDate: today,
          },
        });

        logger.info("worker.daily_analysis_counter_updated", {
          projectId,
          userId: ownerProject.userId,
          dailyAnalysisCount: isToday ? (owner?.dailyAnalysisCount ?? 0) + 1 : 1,
        });

        await prisma.user.update({
          where: { id: ownerProject.userId },
          data: { rateLimitResetAt: null },
        });
      }
    } catch (err: any) {
      logger.error("worker.job_failed", err, { projectId });

      // Check if it's a rate limit error from Groq
      const isRateLimitError =
        err?.error?.error?.code === "rate_limit_exceeded" ||
        err?.message?.includes("Rate limit") ||
        err?.message?.includes("rate_limit_exceeded");

      if (isRateLimitError) {
        logger.warn("worker.rate_limit_detected", { projectId });

        const message = err?.error?.error?.message || err?.message || "";
        let addMs = 0;

        // Extract strictly the "try again in ..." part
        const tryAgainMatch = message.match(/try again in\s+([0-9hms\.]+)/i);

        if (tryAgainMatch) {
          const timePart = tryAgainMatch[1];

          const hoursMatch = timePart.match(/(\d+)h/);
          if (hoursMatch) addMs += parseFloat(hoursMatch[1]) * 3600 * 1000;

          const minutesMatch = timePart.match(/(\d+)m/);
          if (minutesMatch) addMs += parseFloat(minutesMatch[1]) * 60 * 1000;

          const secondsMatch = timePart.match(/(\d+(\.\d+)?)s/);
          if (secondsMatch) addMs += parseFloat(secondsMatch[1]) * 1000;
        }

        // Fallback default 1h if parsing failed but it is rate limit
        if (addMs === 0) addMs = 3600 * 1000;

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

      await prisma.project.updateMany({
        where: { id: projectId },
        data: { status: "ERROR" },
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
