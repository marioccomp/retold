// worker/analyze/classify-file.ts
import path from "path";
import { FileEntry } from "./scan-repository.js";

export type FileRole = "test" | "source" | "ci" | "infra" | "config" | "docs" | "unknown";

const KNOWN_CONFIG_BASENAMES = new Set([
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "biome.json",
  ".eslintrc",
  ".eslintrc.json",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.yaml",
  ".eslintrc.yml",
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.js",
  ".prettierrc.cjs",
  ".prettierrc.yaml",
  ".prettierrc.yml",
  "prettier.config.js",
  "vite.config.ts",
  "vite.config.js",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "nuxt.config.ts",
  "svelte.config.js",
  "jest.config.js",
  "jest.config.ts",
  "vitest.config.ts",
  "vitest.config.js",
  "tailwind.config.ts",
  "tailwind.config.js",
  "postcss.config.js",
  "postcss.config.cjs",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
]);

export function classifyFile(file: FileEntry): FileRole {
  const normalizedPath = file.path.toLowerCase();
  const name = file.name.toLowerCase();
  const ext = file.ext.toLowerCase();

  const folders = normalizedPath.split(path.sep);

  // CI
  if (normalizedPath.includes(`${path.sep}.github${path.sep}workflows`)) return "ci";
  if (name === ".gitlab-ci.yml" || name === ".gitlab-ci.yaml") return "ci";
  if (normalizedPath.includes(`${path.sep}.circleci${path.sep}`)) return "ci";

  // Infra
  if (
    name === "dockerfile" ||
    name === "docker-compose.yml" ||
    name === "docker-compose.yaml" ||
    name === "compose.yml" ||
    name === "compose.yaml"
  )
    return "infra";

  // Docs
  if (name === "readme.md" || ext === ".md") return "docs";

  // Test folders
  if (folders.some((f) => ["test", "tests", "spec", "__tests__"].includes(f))) return "test";

  // Test files
  if (name.endsWith("_test.py")) return "test";
  if (name.endsWith("_test.go")) return "test";
  if (name.endsWith("test.java")) return "test";
  if (/\.(test|spec)\.(js|ts|jsx|tsx)$/.test(name)) return "test";

  // Config (somente conhecidos)
  if (KNOWN_CONFIG_BASENAMES.has(name)) return "config";
  if (normalizedPath.includes(`${path.sep}prisma${path.sep}`) && name === "schema.prisma")
    return "config";
  if (normalizedPath.includes(`${path.sep}.devcontainer${path.sep}`)) return "config";

  // Source code (ext)
  if (
    [
      ".html",
      ".htm",
      ".css",
      ".scss",
      ".sass",
      ".less",
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
      ".py",
      ".go",
      ".java",
      ".cs",
      ".jl",
      ".kt",
      ".rb",
      ".php",
      ".rs",
      ".c",
      ".cpp",
      ".h",
      ".hpp",
      ".kt",
      ".swift",
    ].includes(ext)
  )
    return "source";

  return "unknown";
}
