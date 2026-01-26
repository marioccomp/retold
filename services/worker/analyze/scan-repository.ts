import fs from "fs";
import path from "path";

export type FileEntry = {
  path: string;
  name: string;
  ext: string;
};

export type RepositoryScanResult = {
  files: FileEntry[];
};

export function scanRepository(
  basePath: string,
  // Default depth tuned to catch common layouts like:
  // - src/main/java/... (Spring Boot)
  // - apps/**/src/... (monorepos)
  maxDepth = 15,
  currentDepth = 0,
  acc: FileEntry[] = []
): RepositoryScanResult {
  if (currentDepth > maxDepth) {
    return {
      files: acc,
    };
  }

  const entries = fs.readdirSync(basePath, { withFileTypes: true });

  for (const entry of entries) {
    if (["node_modules", ".git"].includes(entry.name)) continue;

    const fullPath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      scanRepository(fullPath, maxDepth, currentDepth + 1, acc);
    } else {
      acc.push({
        path: fullPath,
        name: entry.name,
        ext: path.extname(entry.name),
      });
    }
  }

  return {
    files: acc,
  };
}

function computeSignals(files: FileEntry[]) {
  const paths = files.map((f) => f.path);

  return {
    hasDockerfile: paths.some((p) => p.endsWith("Dockerfile")),
    hasCI: paths.some(
      (p) =>
        p.includes(".github/workflows") ||
        p.endsWith(".gitlab-ci.yml") ||
        p.endsWith(".circleci/config.yml")
    ),
  };
}
