import { scanRepository } from "./scan-repository.js";
import { detectLanguages } from "./detect-languages.js";
import { detectStack } from "./detect-stack.js";
import { detectAppType } from "./detect-app-type.js";
import { classifyFile } from "./classify-file.js";
import { buildInfraAndStats } from "./build-infra.js";
import { buildStructure } from "./build-struct.js";

export async function analyzeRepository(repoPath: string) {
  const { files } = scanRepository(repoPath);

  const { infra, stats } = buildInfraAndStats(files);
  const structure = buildStructure(files);

  const languages = detectLanguages(files);
  const stack = detectStack(files, languages);
  const appType = detectAppType({
    frameworks: stack.frameworks,
    tools: stack.tools,
    languages,
    signals: {
      hasCI: infra.hasCI,
      hasDockerfile: infra.hasDocker,
    },
  });

  const testFiles = files.filter((f) => classifyFile(f) === "test");

  return {
    summary: {
      primaryLanguage: languages[0] ?? "unknown",
      appType,
    },
    stack,
    infra,
    stats,
    structure,
  };
}
