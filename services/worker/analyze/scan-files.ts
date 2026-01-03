import fs from "fs";
import path from "path";

export function scanFiles(basePath: string) {
  const entries = fs.readdirSync(basePath, { withFileTypes: true });

  const files = entries.filter((e) => e.isFile()).map((e) => e.name);
  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  return {
    files,
    folders,
    signals: {
      hasPackageJson: files.includes("package.json"),
      hasDockerfile: files.includes("Dockerfile"),
      hasTsconfig: files.includes("tsconfig.json"),
      hasGithubCI: folders.includes(".github"),
    },
  };
}
