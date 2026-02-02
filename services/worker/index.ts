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

    // Create a temporary path for this specific job
    const tmpPath = path.resolve("/tmp/retold", String(projectId));

    console.log(`[worker] analyzing project ${projectId}`);

    try {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "ANALYZING" },
      });

      const token = await githubRepository.getToken(projectId);

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

      // Trigger user analysis in parallel with LLM processing
      // Fire and forget - lets the user worker handle it async
      userAnalyzeQueue
        .add("analyze-user", {
          projectId,
          userEmail: projectWithUser.user.email,
          githubUsername: githubUsernameFromUrl,
        })
        .catch((e) => console.error("[worker] failed to queue user analysis", e));

      const llmInsights = await analyzeProjectWithLLM({
        ...analysis,
        readme: readmeContent,
        codeSamples: analysis.codeSamples,
        locale: locale || "en",
      });

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
        const highPriority = ["NestJS", "Express", "FastAPI", "Django", "Flask", "AdonisJS", "Next.js", "Nuxt.js", "Rails"];
        const mediumPriority = ["React Native", "React", "Vue", "Angular", "Svelte", "Flutter", "Spring Boot", "Laravel"];
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
    } catch (err) {
      console.error(err);

      await prisma.project.update({
        where: { id: projectId },
        data: { status: "ERROR" },
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
    concurrency: 2,
  }
);

console.log("Worker running...");
