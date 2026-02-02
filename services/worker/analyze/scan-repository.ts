// worker/analyze/scan-repository.ts
import fs from "fs";
import path from "path";

export type FileEntry = {
  path: string; // absoluto
  relativePath: string; // relativo ao repo
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

  const entries = fs.readdirSync(basePath, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      scanRepository(fullPath, maxDepth, currentDepth + 1, acc, rootPath);
    } else {
      let size = 0;
      try {
        size = fs.statSync(fullPath).size;
      } catch {}

      acc.push({
        path: fullPath,
        relativePath: path.relative(rootPath, fullPath),
        name: entry.name,
        ext: path.extname(entry.name),
        size,
      });
    }
  }

  return { files: acc };
}
