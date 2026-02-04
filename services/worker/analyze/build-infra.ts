// worker/analyze/build-infra.ts
import { FileEntry } from "./scan-repository.js";
import { classifyFile } from "./classify-file.js";

function uniq(arr: string[]) {
  return [...new Set(arr)];
}

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

  const paths = files.map((f) => f.relativePath.toLowerCase());
  const names = files.map((f) => f.name.toLowerCase());

  const hasDockerfile = names.includes("dockerfile");
  const hasCompose =
    names.includes("docker-compose.yml") ||
    names.includes("docker-compose.yaml") ||
    names.includes("compose.yml") ||
    names.includes("compose.yaml");

  const ciProviders: string[] = [];
  if (paths.some((p) => p.includes(".github/workflows/"))) ciProviders.push("github-actions");
  if (names.includes(".gitlab-ci.yml") || names.includes(".gitlab-ci.yaml"))
    ciProviders.push("gitlab-ci");
  if (paths.some((p) => p.includes(".circleci/"))) ciProviders.push("circleci");

  const lintTools: string[] = [];
  if (names.includes("eslint.config.js") || paths.some((p) => p.includes("eslint")))
    lintTools.push("eslint");
  if (paths.some((p) => p.includes("biome"))) lintTools.push("biome");
  if (paths.some((p) => p.includes("prettier"))) lintTools.push("prettier");
  if (paths.some((p) => p.includes("ruff"))) lintTools.push("ruff");
  if (paths.some((p) => p.includes("flake8"))) lintTools.push("flake8");
  if (paths.some((p) => p.includes("black"))) lintTools.push("black");

  const testTools: string[] = [];
  if (paths.some((p) => p.includes("jest"))) testTools.push("jest");
  if (paths.some((p) => p.includes("vitest"))) testTools.push("vitest");
  if (paths.some((p) => p.includes("pytest"))) testTools.push("pytest");

  // K8s: tenta ser menos "chute"
  const hasKubernetes = paths.some(
    (p) =>
      p.endsWith("kustomization.yaml") ||
      p.endsWith("kustomization.yml") ||
      p.includes("/helm/") ||
      p.endsWith("chart.yaml") ||
      ((p.endsWith(".yaml") || p.endsWith(".yml")) &&
        (p.includes("deployment") ||
          p.includes("service") ||
          p.includes("ingress") ||
          p.includes("statefulset")))
  );

  const hasTerraform = paths.some((p) => p.endsWith(".tf"));

  // ===================== Monorepo detection =====================
  // Count package.json files (excluding node_modules)
  const packageJsonCount = files.filter(
    (f) => f.name === "package.json" && !f.relativePath.includes("node_modules")
  ).length;

  // Detect monorepo tools
  let monorepoTool: string | null = null;
  if (names.includes("turbo.json")) monorepoTool = "Turborepo";
  else if (names.includes("nx.json") || names.includes("workspace.json")) monorepoTool = "Nx";
  else if (names.includes("lerna.json")) monorepoTool = "Lerna";
  else if (names.includes("pnpm-workspace.yaml")) monorepoTool = "pnpm workspaces";
  else if (names.includes("rush.json")) monorepoTool = "Rush";

  // Detect workspace directories (common monorepo patterns)
  const workspacePatterns = ["apps/", "packages/", "services/", "libs/", "modules/"];
  const workspaceDirectories = workspacePatterns.filter((pattern) =>
    paths.some((p) => p.startsWith(pattern) && p.includes("/package.json"))
  ).map(p => p.replace("/", ""));

  // Determine if it's a monorepo
  const isMonorepo =
    monorepoTool !== null ||
    packageJsonCount >= 3 ||
    workspaceDirectories.length >= 2;

  return {
    infra: {
      hasDockerfile,
      hasCompose,
      ciProviders: uniq(ciProviders),
      lintTools: uniq(lintTools),
      testTools: uniq(testTools),
      hasTests: testFiles > 0,
      hasKubernetes,
      hasTerraform,
      isMonorepo,
      monorepoTool,
      packageJsonCount,
      workspaceDirectories,
    },
    stats: {
      totalFiles: files.length,
      sourceFiles,
      testFiles,
      docsFiles,
      configFiles,
      unknownFiles: files.length - (sourceFiles + testFiles + docsFiles + configFiles),
    },
  };
}
