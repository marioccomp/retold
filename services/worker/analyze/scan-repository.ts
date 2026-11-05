// worker/analyze/scan-repository.ts
import fs from "fs";
import path from "path";
import { isPathInsideBase, resolveRepositoryRoot } from "../security.js";

export type FileEntry = {
  path: string; // absoluto
  relativePath: string; // relativo ao repo, sempre com "/" (também no Windows)
  name: string;
  ext: string;
  size: number; // bytes
};

export type RepositoryScanResult = {
  files: FileEntry[];
};

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  "coverage",
  ".next",
  ".turbo",
  ".cache",
  "out",
  "bin",
  "obj",
  "vendor",
  ".idea",
  ".vscode",
]);

export function scanRepository(
  basePath: string,
  maxDepth = 15,
  currentDepth = 0,
  acc: FileEntry[] = [],
  rootPath: string = basePath
): RepositoryScanResult {
  if (currentDepth > maxDepth) return { files: acc };

  const repositoryRoot = resolveRepositoryRoot(rootPath);
  const currentPath = resolveRepositoryRoot(basePath);

  if (!isPathInsideBase(currentPath, repositoryRoot)) {
    return { files: acc };
  }

  const entries = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(currentPath, entry.name);
    let entryStats: fs.Stats;

    try {
      entryStats = fs.lstatSync(fullPath);
    } catch {
      continue;
    }

    if (entryStats.isSymbolicLink()) {
      continue;
    }

    let realPath: string;
    try {
      realPath = fs.realpathSync.native(fullPath);
    } catch {
      continue;
    }

    if (!isPathInsideBase(realPath, repositoryRoot)) {
      continue;
    }

    if (entryStats.isDirectory()) {
      scanRepository(realPath, maxDepth, currentDepth + 1, acc, repositoryRoot);
    } else {
      let size = 0;
      try {
        size = fs.statSync(realPath).size;
      } catch {}

      acc.push({
        path: realPath,
        // Always POSIX separators: path checks such as ".github/workflows/" must
        // behave the same on Windows dev machines and on the Linux server.
        relativePath: path.relative(repositoryRoot, realPath).split(path.sep).join("/"),
        name: entry.name,
        ext: path.extname(entry.name),
        size,
      });
    }
  }

  return { files: acc };
}
