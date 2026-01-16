import path from "path";
import { FileEntry } from "./scan-repository.js";

export type FileRole = "test" | "source" | "ci" | "infra" | "config" | "docs" | "unknown";

export function classifyFile(file: FileEntry): FileRole {
  const normalizedPath = file.path.toLowerCase();
  const name = file.name.toLowerCase();
  const ext = file.ext.toLowerCase();

  const folders = normalizedPath.split(path.sep);

  // CI
  if (normalizedPath.includes(`${path.sep}.github${path.sep}workflows`)) {
    return "ci";
  }

  // Infra
  if (
    name === "dockerfile" ||
    name === "docker-compose.yml" ||
    name === "docker-compose.yaml" ||
    name === "compose.yaml" ||
    name === "compose.yml"
  )
    return "infra";

  // Docs
  if (name === "readme.md" || ext === ".md") {
    return "docs";
  }

  // Test folders (EXATOS)
  if (folders.some((f) => ["test", "tests", "spec", "__tests__"].includes(f))) {
    return "test";
  }

  // Test files por linguagem
  if (name.endsWith("_test.py")) return "test";
  if (name.endsWith("_test.go")) return "test";
  if (name.endsWith("test.java")) return "test";
  if (/\.(test|spec)\.(js|ts|jsx|tsx)$/.test(name)) return "test";

  // Config
  if (ext === ".json" || ext === ".yml" || ext === ".yaml") {
    return "config";
  }

  return "source";
}
