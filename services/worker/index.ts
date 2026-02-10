import "dotenv/config";
import path from "path";
import fs from "fs";
import { Worker } from "bullmq";
import { redisConnection, userAnalyzeQueue } from "@repo/queue";
import "./user-worker";
import "./last-commit-worker";
import { cloneRepository } from "./clone";
import { prisma, githubRepository } from "@repo/database";
import { analyzeProjectWithLLM } from "./llm/analyze-project";
import { analyzeRepository } from "./analyze/index";

function readRepositoryReadme(repoPath: string, maxChars = 30_000) {
  const possibleReadmePaths = ["README.md", "readme.md", "README.MD"];
  for (const fileName of possibleReadmePaths) {
    const filePath = path.join(repoPath, fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return content.length > maxChars ? content.slice(0, maxChars) : content;
    }
  }
  return "";
}

console.log("[worker] Starting worker...");

const worker = new Worker(
  "analyze-repo",
  async (job) => {
    const { projectId, repoUrl, locale } = job.data;

    const tmpPath = path.resolve("/tmp/retold", String(projectId));

    console.log(`[worker] analyzing project ${projectId}`);

    try {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "ANALYZING" },
      });

      let token = "";
      try {
        token = await githubRepository.getToken(projectId);
      } catch (e: any) {
        if (e.message.includes("No github installations found")) {
          console.log(
            "[worker] No GitHub installation found. Attempting public clone without token."
          );
        } else {
          throw e;
        }
      }

      const projectWithUser = await prisma.project.findUnique({
        where: { id: projectId },
        include: { user: true },
      });

      if (!projectWithUser || !projectWithUser.user) {
        throw new Error("Project or User not found");
      }

      await cloneRepository(repoUrl, tmpPath, token);
      const readmeContent = readRepositoryReadme(tmpPath);

      // Extract username from repo URL (e.g., https://github.com/username/repo -> username)
      const githubUsernameFromUrl =
        repoUrl.split("github.com/")[1]?.split("/")[0] ||
        repoUrl.split("github.com:")[1]?.split("/")[0] ||
        projectWithUser.user.username;

      const analysis = await analyzeRepository(tmpPath, { readme: readmeContent, repoUrl });

      const repoName = repoUrl.split("github.com/")[1]?.split("/")[1] || "";

      // Trigger user analysis in parallel with LLM processing
      // Fire and forget - lets the user worker handle it async
      userAnalyzeQueue
        .add("analyze-user", {
          projectId,
          userEmail: projectWithUser.user.email,
          githubUsername: githubUsernameFromUrl,
        })
        .catch((e) => console.error("[worker] failed to queue user analysis", e));

      const llmInsights = await analyzeProjectWithLLM(
        {
          ...analysis,
          readme: readmeContent,
          codeSamples: analysis.codeSamples,
          locale: locale || "en",
        },
        repoName
      );

      const llmInsightsJson = JSON.stringify(llmInsights);

      console.log(llmInsightsJson);

      await prisma.repositoryAnalysis.upsert({
        where: { projectId },
        create: {
          projectId,
          appType: analysis.summary.appType,
          stack: analysis.stack,
          structure: analysis.structure,
          signals: analysis.infra,
          rawAnalysis: analysis,
          llmOverview: llmInsightsJson,
        },
        update: {
          appType: analysis.summary.appType,
          stack: analysis.stack,
          structure: analysis.structure,
          signals: analysis.infra,
          rawAnalysis: analysis,
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
        console.log(`[worker] assigned tags: ${tagsToAssign.join(", ")}`);
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

        console.log(
          `[worker] User ${ownerProject.userId} daily analysis count: ${
            isToday ? (owner?.dailyAnalysisCount ?? 0) + 1 : 1
          }`
        );
      }
    } catch (err: any) {
      console.error(err);

      // Check if it's a rate limit error from Groq
      const isRateLimitError =
        err?.error?.error?.code === "rate_limit_exceeded" ||
        err?.message?.includes("Rate limit") ||
        err?.message?.includes("rate_limit_exceeded");

      if (isRateLimitError) {
        console.log("[worker] Rate limit hit - marking project as RATE_LIMITED");

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

        console.log(
          `[worker] Rate limit duration parsed: ${addMs}ms. Reset at: ${resetAt.toISOString()}`
        );

        // Find owner to lock
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { userId: true },
        });

        if (project) {
          await prisma.user.update({
            where: { id: project.userId },
            data: { rateLimitResetAt: resetAt },
          });
          console.log(`[worker] User ${project.userId} locked until ${resetAt.toISOString()}`);
        }

        await prisma.project.delete({
          where: { id: projectId },
        });

        return;
      }

      await prisma.project.delete({
        where: { id: projectId },
      });

      throw err;
    } finally {
      if (process.env.NODE_ENV === "production") {
        fs.rmSync(tmpPath, { recursive: true, force: true });
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
);

console.log("Worker running...");
