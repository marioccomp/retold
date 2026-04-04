import { scanRepository } from "./scan-repository.js";
import { detectLanguages } from "./detect-languages.js";
import { detectStack } from "./detect-stack.js";
import { detectAppType } from "./detect-app-type.js";
import { classifyFile } from "./classify-file.js";
import { buildInfraAndStats } from "./build-infra.js";
import { buildStructure } from "./build-struct.js";

import path from "path";
import { classifyProject } from "./classify-project.js";
import { selectCodeSamples } from "./select-code-samples.js";

export async function analyzeRepository(
  repoPath: string,
  opts?: { readme?: string; repoUrl?: string; includeCodeSamples?: boolean }
) {
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
    languages: [...new Set([...detectedLanguages, ...stack.languages])],
    signals: {
      hasCI: infra.ciProviders.length > 0,
      hasDockerfile: infra.hasDockerfile,
      hasCompose: infra.hasCompose,
    },
  });

  const primaryLanguage = detectedLanguages[0] ?? stack.languages[0] ?? "Unknown";

  const classification = classifyProject({
    files: files.map((f) => ({ path: path.relative(repoPath, f.path), name: f.name })),
    readme: opts?.readme ?? "",
    repoUrl: opts?.repoUrl,
    stack,
    infra: {
      hasCI: infra.ciProviders.length > 0,
      hasDocker: infra.hasDockerfile || infra.hasCompose,
      hasTests: infra.hasTests,
    },
    primaryLanguage,
  });

  const testFiles = files.filter((f) => classifyFile(f) === "test");

  // Select code samples if necessary (no readme or low confidence/unknowns)
  let codeSamples: any[] = [];
  const needsMoreContext =
    !opts?.readme || classification.confidence < 0.6 || classification.purpose === "unknown";

  if (opts?.includeCodeSamples && needsMoreContext) {
    codeSamples = selectCodeSamples(files, 2).map((s) => ({
      ...s,
      relativePath: path.relative(repoPath, s.relativePath),
    }));
  }

  return {
    summary: {
      // Prefer extension-based detection; fallback to inferred stack languages.
      primaryLanguage,
      appType,
    },
    stack,
    infra,
    stats,
    structure,
    classification,
    codeSamples,
  };
}
