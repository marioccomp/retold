import "dotenv/config";
import path from "path";
import fs from "fs";
import { Worker } from "bullmq";
import { redisConnection } from "@repo/queue/redis.js";
import { cloneRepository } from "./clone.js";
import { prisma } from "@repo/database";
import { analyzeProjectWithLLM } from "./llm/analyze-project.js";
import { analyzeRepository } from "./analyze/index.js";

function printOverview(overview: string, projectId: string) {
  const separator = "=".repeat(80);
  console.log(`\n${separator}`);
  console.log(`Project: ${projectId}\n`);
  console.log(overview);
  console.log(`${separator}\n`);

  // Cria pasta temp/overview dentro do projeto se não existir
  const tempDir = path.resolve("./temp/overview");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const mdPath = path.join(tempDir, `${projectId}-overview.md`);
  fs.writeFileSync(mdPath, `# Project Overview: ${projectId}\n\n${overview}`);
  console.log(`Saved overview to ${mdPath}`);
}

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
    const { projectId, repoUrl } = job.data;

    // Create a temporary path for this specific job
    const tmpPath = path.resolve("/tmp/retold", String(projectId));

    console.log(`[worker] analyzing project ${projectId}`);

    try {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "ANALYZING" },
      });

      await cloneRepository(repoUrl, tmpPath);
      const readmeContent = readRepositoryReadme(tmpPath);
      const analysis = await analyzeRepository(tmpPath);

      const llmInsights = await analyzeProjectWithLLM({
        ...analysis,
        readme: readmeContent,
      });

      printOverview(llmInsights ?? "", projectId);

      console.log("[worker] analysis result:", JSON.stringify(analysis, null, 2));

      await prisma.repositoryAnalysis.upsert({
        where: { projectId },
        create: {
          projectId,
          appType: analysis.summary.appType,
          stack: analysis.stack,
          structure: analysis.structure,
          signals: analysis.infra,
          rawAnalysis: analysis,
          llmOverview: llmInsights,
        },
        update: {
          appType: analysis.summary.appType,
          stack: analysis.stack,
          structure: analysis.structure,
          signals: analysis.infra,
          rawAnalysis: analysis,
          llmOverview: llmInsights,
        },
      });

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
