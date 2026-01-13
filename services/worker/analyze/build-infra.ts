import { FileEntry } from "./scan-repository.js";
import { classifyFile } from "./classify-file.js";

export function buildInfraAndStats(files: FileEntry[]) {
  let testFiles = 0;
  let sourceFiles = 0;
  let configFiles = 0;
  let docsFiles = 0;

  for (const file of files) {
    const role = classifyFile(file);

    if (role === "test") testFiles++;
    else if (role === "config") configFiles++;
    else if (role === "docs") docsFiles++;
    else if (role === "source") sourceFiles++;
  }

  const paths = files.map((f) => f.path.toLowerCase());

  return {
    infra: {
      hasDocker: paths.some((p) => p.endsWith("dockerfile")),
      hasCI: paths.some(
        (p) =>
          p.includes(".github/workflows") || p.includes(".gitlab-ci") || p.includes(".circleci")
      ),
      hasLint: paths.some(
        (p) => p.includes("eslint") || p.includes("ruff") || p.includes("flake8")
      ),
      hasTests: testFiles > 0,
      hasKubernetes: paths.some((p) => p.includes("k8s") || p.includes("kubernetes") || p.endsWith(".yaml") && p.includes("deployment")),
      hasTerraform: paths.some((p) => p.endsWith(".tf")),
    },
    stats: {
      totalFiles: files.length,
      sourceFiles,
      testFiles,
      configFiles,
      docsFiles,
    },
  };
}
