import path from "path";
import { FileEntry } from "./scan-repository.js";

export function buildStructure(files: FileEntry[]) {
  const folders = new Set<string>();
  let maxDepth = 0;

  for (const file of files) {
    const parts = file.path.split(path.sep);
    maxDepth = Math.max(maxDepth, parts.length);
    parts.forEach((p) => folders.add(p));
  }

  return {
    hasSrcFolder: folders.has("src"),
    hasTestsFolder: folders.has("test") || folders.has("tests") || folders.has("__tests__"),
    maxDepth,
  };
}
