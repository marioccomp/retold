// worker/analyze/build-struct.ts
import path from "path";
import { FileEntry } from "./scan-repository.js";

export function buildStructure(files: FileEntry[]) {
  const topLevelDirs = new Set<string>();
  const secondLevelDirs = new Set<string>();
  const ignored = ["node_modules", ".git", "dist", "build", ".next", "out", "target", "vendor"];

  let packageJsonCount = 0;
  let hasAppsDir = false;
  let hasPackagesDir = false;

  for (const f of files) {
    const rel = f.relativePath.split(path.sep);
    const top = rel[0];
    if (top && top !== "." && !top.includes(".") && !ignored.includes(top)) topLevelDirs.add(top);

    if (rel.length >= 2) {
      const second = rel[1];
      if (second && !second.includes(".")) {
        secondLevelDirs.add(`${top}/${second}`);
      }
    }

    if (f.name === "package.json") packageJsonCount++;

    if (top === "apps") hasAppsDir = true;
    if (top === "packages") hasPackagesDir = true;
  }

  return {
    topLevelDirs: [...topLevelDirs].slice(0, 30),
    secondLevelDirs: [...secondLevelDirs].sort().slice(0, 50),
    packageJsonCount,
    hasAppsDir,
    hasPackagesDir,
  };
}
