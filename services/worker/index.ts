import path from "path";
import fs from "fs";
import { cloneRepository } from "./clone.js";
import { analyzeRepository } from "./analyze/index.js";
import { analyzeProjectWithLLM } from "./llm/analyze-project.js";

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

async function run() {
  const raw = process.argv[2];

  if (!raw) {
    throw new Error("Missing payload");
  }

  const payload = JSON.parse(raw);

  const { projectId, repoUrl } = payload;

  const tmpPath = path.resolve("/tmp/retold", projectId);

  try {
    console.log(`[worker] analyzing project ${projectId}`);

    // TODO: update project status -> analyzing

    await cloneRepository(repoUrl, tmpPath);
    const analysis = analyzeRepository(tmpPath);

    let readmeContent = "";
    const possibleReadmePaths = ["README.md", "readme.md", "README.MD"];
    for (const fileName of possibleReadmePaths) {
      const filePath = path.join(tmpPath, fileName);
      if (fs.existsSync(filePath)) {
        readmeContent = fs.readFileSync(filePath, "utf-8");
        break;
      }
    }

    const llmInsights = await analyzeProjectWithLLM({
      ...analysis,
      readme: readmeContent,
    });
    const result = {
      ...analysis,
      llm: {
        overview: llmInsights,
      },
    };

    printOverview(llmInsights ?? "", projectId);

    // TODO: save analysis in DB

    // TODO: update project status -> done
  } catch (err) {
    console.error(err);
    // TODO: update project status -> error
  } finally {
    if (process.env.NODE_ENV === "production") {
      fs.rmSync(tmpPath, { recursive: true, force: true });
    }
  }
}

await run();
