/**
 * Repository map: deterministic facts about a repository, computed without any
 * LLM call. Phase 1 of docs/analysis-roadmap.md.
 *
 * - dependency graph between files (imports) and file importance (PageRank)
 * - recent churn per file
 * - modules (workspaces / conventional folders) with per-module facts
 * - generated code and repository hygiene (committed node_modules, .env, ...)
 * - measured maturity
 *
 * The map is persisted with the analysis. It is intentionally NOT added to the
 * current LLM prompt (which already hits the free-tier token limit); phase 2
 * uses it to pick what the LLM reads.
 */
import path from "path";

import { classifyFile } from "../classify-file.js";
import { EXTENSION_LANGUAGE_MAP } from "../detect-languages.js";
import type { FileEntry } from "../scan-repository.js";
import { tryReadRepositoryTextFile } from "../../security.js";
import { ChurnStats, readChurn } from "./churn.js";
import { addEdge, countEdges, createGraph, fanIn, pageRank } from "./graph.js";
import { buildHygieneReport, HygieneReport, isGeneratedSource, listTrackedFiles } from "./hygiene.js";
import {
  buildJvmClassIndex,
  extractImports,
  importLanguageOf,
  parseLooseJson,
  ResolutionContext,
  resolveImport,
} from "./imports.js";
import { MaturityReport, scoreMaturity } from "./maturity.js";
import { detectModules, moduleOf } from "./modules.js";

export const REPO_MAP_VERSION = 1;

const MAX_SOURCE_BYTES = 512 * 1024;
const MAX_SOURCE_FILES = 6_000;
const STATICALLY_TYPED = new Set(["Go", "Rust", "Java", "Kotlin", "C#", "Swift", "C", "C++", "Scala"]);

export type RepoMapFile = {
  path: string;
  module: string;
  loc: number;
  fanIn: number;
  fanOut: number;
  /** PageRank normalized so the most central file is 1. */
  centrality: number;
  recentCommits: number;
};

export type RepoMapModule = {
  path: string;
  files: number;
  sourceFiles: number;
  testFiles: number;
  loc: number;
  languages: string[];
  /** Most central files of the module. */
  keyFiles: string[];
  externalDependencies: string[];
  /** Other modules this one imports, most used first. */
  dependsOn: string[];
};

export type RepoMap = {
  version: number;
  modules: RepoMapModule[];
  /** Most central non-test source files of the whole repository. */
  centralFiles: RepoMapFile[];
  /** Files with the most recent changes. */
  hotFiles: { path: string; commits: number; linesChanged: number }[];
  graph: {
    nodes: number;
    edges: number;
    resolvedImports: number;
    unresolvedImports: number;
    externalDependencies: { name: string; imports: number }[];
  };
  history: { commitsAnalyzed: number; contributors: number };
  generatedFiles: { count: number; examples: string[] };
  hygiene: HygieneReport;
  maturity: MaturityReport;
};

export type RepoMapInput = {
  repoPath: string;
  files: FileEntry[];
  readme: string;
  primaryLanguage: string;
  infra: {
    ciProviders: string[];
    lintTools: string[];
    hasDockerfile: boolean;
    hasCompose: boolean;
  };
  /** Injected in tests; read from git by default. */
  trackedFiles?: string[];
  churn?: ChurnStats;
};

function countLoc(content: string) {
  let loc = 0;
  for (const line of content.split("\n")) if (line.trim()) loc++;
  return loc;
}

function buildResolutionContext(
  filePaths: string[],
  read: (filePath: string) => string | null
): ResolutionContext {
  const files = new Set(filePaths);
  const aliases: ResolutionContext["aliases"] = [];
  const workspacePackages = new Map<string, string>();
  const goModules: ResolutionContext["goModules"] = [];

  for (const filePath of filePaths) {
    const name = path.posix.basename(filePath);
    const dir = path.posix.dirname(filePath) === "." ? "" : path.posix.dirname(filePath);

    if (/^(tsconfig|jsconfig)(\.[\w-]+)?\.json$/.test(name)) {
      const config = parseLooseJson(read(filePath) ?? "") as {
        compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
      } | null;
      const baseDir = path.posix.join(dir || ".", config?.compilerOptions?.baseUrl ?? ".");
      for (const [key, targets] of Object.entries(config?.compilerOptions?.paths ?? {})) {
        aliases.push({
          scopeDir: dir,
          prefix: key.replace(/\*$/, ""),
          targets: targets.map((t) => path.posix.normalize(path.posix.join(baseDir, t.replace(/\*$/, "")))),
        });
      }
    } else if (name === "package.json" && !filePath.includes("node_modules/")) {
      const pkg = parseLooseJson(read(filePath) ?? "") as { name?: string } | null;
      if (pkg?.name) workspacePackages.set(pkg.name, dir);
    } else if (name === "go.mod") {
      const modulePath = (read(filePath) ?? "").match(/^module\s+(\S+)/m)?.[1];
      if (modulePath) goModules.push({ modulePath, dir });
    }
  }

  // Keep the "root" alias resolution relative to the repository.
  for (const alias of aliases) {
    alias.targets = alias.targets.map((t) => (t === "." ? "" : t.replace(/^\.\//, "")));
  }

  return { files, aliases, workspacePackages, goModules, jvmClasses: buildJvmClassIndex(filePaths) };
}

function isTypeChecked(
  primaryLanguage: string,
  filePaths: Set<string>,
  read: (filePath: string) => string | null
) {
  if (STATICALLY_TYPED.has(primaryLanguage)) return true;

  if (primaryLanguage === "TypeScript") {
    return [...filePaths]
      .filter((f) => /(^|\/)tsconfig(\.[\w-]+)?\.json$/.test(f))
      .some((f) => {
        const config = parseLooseJson(read(f) ?? "") as { compilerOptions?: { strict?: boolean } } | null;
        return config?.compilerOptions?.strict === true;
      });
  }

  if (primaryLanguage === "Python") {
    if (filePaths.has("mypy.ini") || filePaths.has(".mypy.ini") || filePaths.has("pyrightconfig.json")) {
      return true;
    }
    const pyproject = filePaths.has("pyproject.toml") ? read("pyproject.toml") ?? "" : "";
    return /\[tool\.(mypy|pyright)\]/.test(pyproject);
  }

  return false;
}

/** Linters/formatters configured through files the path-based detection can't see. */
export function detectLintConfigs(fileSet: Set<string>, read: (filePath: string) => string | null) {
  const tools = new Set<string>();
  const pyproject = fileSet.has("pyproject.toml") ? read("pyproject.toml") ?? "" : "";
  for (const tool of ["ruff", "black", "flake8", "pylint", "isort"]) {
    if (pyproject.includes(`[tool.${tool}`)) tools.add(tool);
  }
  const byFile: [RegExp, string][] = [
    [/^\.pre-commit-config\.ya?ml$/, "pre-commit"],
    [/(^|\/)\.?rustfmt\.toml$/, "rustfmt"],
    [/(^|\/)\.?clippy\.toml$/, "clippy"],
    [/(^|\/)\.golangci\.(ya?ml|toml|json)$/, "golangci-lint"],
    [/(^|\/)checkstyle\.xml$/, "checkstyle"],
    [/(^|\/)\.rubocop\.yml$/, "rubocop"],
    [/(^|\/)\.clang-(format|tidy)$/, "clang-format"],
    [/(^|\/)(\.flake8|\.pylintrc|ruff\.toml|\.ruff\.toml)$/, "python-lint"],
  ];
  for (const filePath of fileSet) {
    for (const [pattern, tool] of byFile) if (pattern.test(filePath)) tools.add(tool);
  }
  return [...tools];
}

const CI_CONFIG = /^(\.github\/workflows\/[^/]+\.ya?ml|\.gitlab-ci\.ya?ml|\.circleci\/config\.ya?ml|azure-pipelines\.ya?ml|Jenkinsfile|\.travis\.ya?ml)$/;

export function buildRepoMap(input: RepoMapInput): RepoMap {
  const { repoPath } = input;
  const readCache = new Map<string, string | null>();
  const read = (filePath: string) => {
    if (!readCache.has(filePath)) {
      let content: string | null = null;
      try {
        content = tryReadRepositoryTextFile(repoPath, filePath, 300_000);
      } catch {
        content = null; // blocked path (symlink, outside the repository, ...)
      }
      readCache.set(filePath, content);
    }
    return readCache.get(filePath)!;
  };

  const filePaths = input.files.map((f) => f.relativePath);
  const fileSet = new Set(filePaths);
  const ctx = buildResolutionContext(filePaths, read);

  // ---- Source files, generated code, LOC
  const roles = new Map(input.files.map((f) => [f.relativePath, classifyFile(f)]));
  const sizes = new Map(input.files.map((f) => [f.relativePath, f.size]));
  const loc = new Map<string, number>();
  const contents = new Map<string, string>();
  const generated: string[] = [];

  const candidates = input.files
    .filter((f) => importLanguageOf(f.relativePath) !== null && f.size <= MAX_SOURCE_BYTES)
    .slice(0, MAX_SOURCE_FILES);

  for (const file of candidates) {
    const content = read(file.relativePath);
    if (content === null) continue;
    if (isGeneratedSource(file.relativePath, content)) {
      generated.push(file.relativePath);
      continue;
    }
    contents.set(file.relativePath, content);
    loc.set(file.relativePath, countLoc(content));
  }

  const sourcePaths = [...contents.keys()];
  const isTest = (filePath: string) => roles.get(filePath) === "test";

  // ---- Dependency graph
  const graph = createGraph(sourcePaths);
  const externalImports = new Map<string, Map<string, number>>(); // file -> package -> count
  let resolvedImports = 0;
  let unresolvedImports = 0;

  for (const [filePath, content] of contents) {
    const language = importLanguageOf(filePath)!;
    for (const specifier of new Set(extractImports(content, language))) {
      const resolved = resolveImport(filePath, specifier, language, ctx);
      if (resolved.kind === "internal") {
        resolvedImports++;
        for (const target of resolved.files) addEdge(graph, filePath, target);
      } else if (resolved.kind === "external") {
        if (resolved.name.includes(":")) continue; // standard library
        const perFile = externalImports.get(filePath) ?? new Map<string, number>();
        perFile.set(resolved.name, (perFile.get(resolved.name) ?? 0) + 1);
        externalImports.set(filePath, perFile);
      } else {
        unresolvedImports++;
      }
    }
  }

  const ranks = pageRank(graph);
  const maxRank = Math.max(...ranks.values(), 0) || 1;
  const fanInCounts = fanIn(graph);

  // ---- History, modules, hygiene
  const churn = input.churn ?? readChurn(repoPath);
  const modules = detectModules(filePaths, new Set(sourcePaths), read);
  const modulePaths = [...modules, "."];

  const fileFacts = (filePath: string): RepoMapFile => ({
    path: filePath,
    module: moduleOf(filePath, modules),
    loc: loc.get(filePath) ?? 0,
    fanIn: fanInCounts.get(filePath) ?? 0,
    fanOut: graph.edges.get(filePath)?.size ?? 0,
    centrality: Number(((ranks.get(filePath) ?? 0) / maxRank).toFixed(4)),
    recentCommits: churn.files.get(filePath)?.commits ?? 0,
  });

  const byCentrality = sourcePaths
    .filter((f) => !isTest(f))
    .sort((a, b) => (ranks.get(b) ?? 0) - (ranks.get(a) ?? 0) || (loc.get(b) ?? 0) - (loc.get(a) ?? 0));

  const moduleFacts: RepoMapModule[] = modulePaths
    .map((modulePath) => {
      const inModule = (f: string) => moduleOf(f, modules) === modulePath;
      const moduleSources = sourcePaths.filter(inModule);

      const languages = new Map<string, number>();
      for (const f of moduleSources) {
        const language = EXTENSION_LANGUAGE_MAP[path.posix.extname(f)];
        if (language) languages.set(language, (languages.get(language) ?? 0) + 1);
      }

      const external = new Map<string, number>();
      const dependsOn = new Map<string, number>();
      for (const f of moduleSources) {
        for (const [name, count] of externalImports.get(f) ?? []) {
          external.set(name, (external.get(name) ?? 0) + count);
        }
        for (const target of graph.edges.get(f) ?? []) {
          const targetModule = moduleOf(target, modules);
          if (targetModule !== modulePath) dependsOn.set(targetModule, (dependsOn.get(targetModule) ?? 0) + 1);
        }
      }

      const top = <K>(entries: Map<K, number>, n: number) =>
        [...entries.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key]) => key);

      return {
        path: modulePath,
        files: filePaths.filter(inModule).length,
        sourceFiles: moduleSources.filter((f) => !isTest(f)).length,
        testFiles: filePaths.filter((f) => inModule(f) && isTest(f)).length,
        loc: moduleSources.reduce((sum, f) => sum + (loc.get(f) ?? 0), 0),
        languages: top(languages, 3),
        keyFiles: byCentrality.filter(inModule).slice(0, 5),
        externalDependencies: top(external, 8),
        dependsOn: top(dependsOn, 6),
      };
    })
    .filter((m) => m.files > 0);

  const trackedFiles = input.trackedFiles ?? listTrackedFiles(repoPath);
  const hygiene = buildHygieneReport(trackedFiles.length > 0 ? trackedFiles : filePaths, sizes);

  // ---- Measured maturity
  const ciConfigs = filePaths.filter((f) => CI_CONFIG.test(f)).map((f) => read(f) ?? "");
  const maturity = scoreMaturity({
    sourceFiles: sourcePaths.filter((f) => !isTest(f)).length,
    testFiles: filePaths.filter(isTest).length,
    ciProviders: input.infra.ciProviders,
    ciConfigs,
    lintTools: [...new Set([...input.infra.lintTools, ...detectLintConfigs(fileSet, read)])],
    typeChecked: isTypeChecked(input.primaryLanguage, fileSet, read),
    containerized: input.infra.hasDockerfile || input.infra.hasCompose,
    readme: input.readme,
    commitsAnalyzed: churn.commitsAnalyzed,
    contributors: churn.contributors,
    hygiene,
  });

  const allExternal = new Map<string, number>();
  for (const perFile of externalImports.values()) {
    for (const [name, count] of perFile) allExternal.set(name, (allExternal.get(name) ?? 0) + count);
  }

  return {
    version: REPO_MAP_VERSION,
    modules: moduleFacts,
    centralFiles: byCentrality.slice(0, 25).map(fileFacts),
    hotFiles: [...churn.files.entries()]
      .filter(([f]) => fileSet.has(f))
      .sort((a, b) => b[1].commits - a[1].commits || b[1].linesChanged - a[1].linesChanged)
      .slice(0, 10)
      .map(([f, stats]) => ({ path: f, ...stats })),
    graph: {
      nodes: graph.nodes.length,
      edges: countEdges(graph),
      resolvedImports,
      unresolvedImports,
      externalDependencies: [...allExternal.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, imports]) => ({ name, imports })),
    },
    history: { commitsAnalyzed: churn.commitsAnalyzed, contributors: churn.contributors },
    generatedFiles: { count: generated.length, examples: generated.slice(0, 5) },
    hygiene,
    maturity,
  };
}
