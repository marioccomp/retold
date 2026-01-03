import path from "path";
import { scanFiles } from "./scan-files.js";
import { detectStack } from "./detect-stack.js";
import { detectAppType } from "./detect-app-type.js";

export function analyzeRepository(repoPath: string) {
  const scan = scanFiles(repoPath);
  const stack = detectStack(repoPath);
  const appType = detectAppType(stack);

  return {
    scan,
    stack,
    appType,
  };
}
