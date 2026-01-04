import { scanRepository } from "./scan-repository.js";
import { detectLanguages } from "./detect-languages.js";
import { detectStack } from "./detect-stack.js";
import { detectAppType } from "./detect-app-type.js";
import { classifyFile } from "./classify-file.js";

export function analyzeRepository(repoPath: string) {
  const { files, signals } = scanRepository(repoPath);

  const languages = detectLanguages(files);
  const stack = detectStack(files, languages);
  const appType = detectAppType({
    frameworks: stack.frameworks,
    tools: stack.tools,
    languages,
    signals,
  });

  const testFiles = files.filter((f) => classifyFile(f) === "test");

  return {
    summary: {
      primaryLanguage: languages[0] ?? "unknown",
      appType,
    },
    stack,
    stats: {
      totalFiles: files.length,
      testFiles: testFiles.length,
    },
  };
}
