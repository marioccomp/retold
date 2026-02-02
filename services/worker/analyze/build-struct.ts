// worker/analyze/build-struct.ts
import path from "path";
import { FileEntry } from "./scan-repository.js";

export function buildStructure(files: FileEntry[]) {
  const topLevelDirs = new Set<string>();

  let packageJsonCount = 0;
  let hasAppsDir = false;
  let hasPackagesDir = false;

  for (const f of files) {
    const rel = f.relativePath.split(path.sep);
    const top = rel[0];
    if (top && top !== "." && !top.includes(".")) topLevelDirs.add(top);

    if (f.name === "package.json") packageJsonCount++;

    if (top === "apps") hasAppsDir = true;
    if (top === "packages") hasPackagesDir = true;
  }

  return {
    topLevelDirs: [...topLevelDirs].slice(0, 30),
    packageJsonCount,
    hasAppsDir,
    hasPackagesDir,
  };
}
