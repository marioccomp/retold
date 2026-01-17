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

  // Languages detected by file extensions (best signal when scan depth includes source)
  const detectedLanguages = detectLanguages(files);
  // Stack detection can also infer languages from project files (pom.xml, go.mod, etc.)
  const stack = detectStack(files, detectedLanguages);
  // Keep appType consistent with stack: use union of both sources.
  const languagesForAppType = [...new Set([...detectedLanguages, ...stack.languages])];
  const appType = detectAppType({
    frameworks: stack.frameworks,
    tools: stack.tools,
    languages: languagesForAppType,
    signals: {
      hasCI: infra.hasCI,
      hasDockerfile: infra.hasDocker,
    },
  });

  const testFiles = files.filter((f) => classifyFile(f) === "test");

  return {
    summary: {
      // Prefer extension-based detection; fallback to inferred stack languages.
      primaryLanguage: detectedLanguages[0] ?? stack.languages[0] ?? "Unknown",
      appType,
    },
    stack,
    infra,
    stats,
    structure,
  };
}
