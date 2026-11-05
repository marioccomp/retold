/**
 * Splits a repository into modules (the unit of analysis for later phases).
 *
 * Order of evidence:
 *   1. declared workspaces (package.json workspaces, pnpm-workspace.yaml,
 *      Cargo [workspace] members, go.work)
 *   2. conventional containers (apps/*, packages/*, services/*, libs/*, crates/*, cmd/*)
 *   3. top-level directories that contain source files
 * Files outside every module belong to the root module ".".
 */
import path from "path";

import { parseLooseJson } from "./imports.js";

const CONVENTIONAL_CONTAINERS = ["apps", "packages", "services", "libs", "modules", "crates", "cmd", "plugins"];

export type ManifestReader = (filePath: string) => string | null;

function globToDirectories(pattern: string, directories: Set<string>) {
  const clean = pattern.trim().replace(/^\.\//, "").replace(/\/$/, "");
  if (!clean || clean.startsWith("!")) return [];
  if (!clean.includes("*")) return directories.has(clean) ? [clean] : [];

  const base = clean.slice(0, clean.indexOf("*")).replace(/\/$/, "");
  const recursive = clean.includes("**");
  return [...directories].filter((dir) => {
    if (!dir.startsWith(`${base}/`)) return false;
    const rest = dir.slice(base.length + 1);
    return recursive || !rest.includes("/");
  });
}

/** Workspace member patterns declared in the repository root (and nested package.json files). */
export function readWorkspacePatterns(files: Set<string>, read: ManifestReader): string[] {
  const patterns: string[] = [];

  for (const manifest of ["package.json", "lerna.json"]) {
    if (!files.has(manifest)) continue;
    const json = parseLooseJson(read(manifest) ?? "") as {
      workspaces?: string[] | { packages?: string[] };
      packages?: string[];
    } | null;
    const workspaces = Array.isArray(json?.workspaces) ? json.workspaces : json?.workspaces?.packages;
    patterns.push(...(workspaces ?? []), ...(manifest === "lerna.json" ? json?.packages ?? [] : []));
  }

  if (files.has("pnpm-workspace.yaml")) {
    const yaml = read("pnpm-workspace.yaml") ?? "";
    const block = yaml.split(/^packages:\s*$/m)[1] ?? "";
    for (const line of block.split("\n")) {
      const match = line.match(/^\s*-\s*["']?([^"'#\n]+?)["']?\s*(#.*)?$/);
      if (match) patterns.push(match[1]);
      else if (line.trim() && !line.startsWith(" ") && !line.startsWith("\t")) break;
    }
  }

  if (files.has("Cargo.toml")) {
    const toml = read("Cargo.toml") ?? "";
    const members = toml.match(/\[workspace\][\s\S]*?members\s*=\s*\[([\s\S]*?)\]/)?.[1];
    if (members) patterns.push(...[...members.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]));
  }

  if (files.has("go.work")) {
    const goWork = read("go.work") ?? "";
    const useBlock = goWork.match(/use\s*\(([\s\S]*?)\)/)?.[1] ?? goWork.match(/use\s+(\S+)/)?.[1] ?? "";
    patterns.push(...useBlock.split(/\s+/).filter((p) => p && p !== "."));
  }

  return patterns;
}

export function detectModules(
  files: string[],
  sourceFiles: Set<string>,
  read: ManifestReader
): string[] {
  const fileSet = new Set(files);
  const directories = new Set<string>();
  for (const file of files) {
    let dir = path.posix.dirname(file);
    while (dir !== "." && !directories.has(dir)) {
      directories.add(dir);
      dir = path.posix.dirname(dir);
    }
  }

  const hasSource = (dir: string) => [...sourceFiles].some((f) => f.startsWith(`${dir}/`));

  // 1. Declared workspaces.
  const declared = readWorkspacePatterns(fileSet, read)
    .flatMap((pattern) => globToDirectories(pattern, directories))
    .filter(hasSource);
  if (declared.length > 0) return [...new Set(declared)].sort();

  // 2. Conventional containers: their children are modules.
  const conventional = CONVENTIONAL_CONTAINERS.filter((c) => directories.has(c)).flatMap((container) =>
    [...directories].filter(
      (dir) => dir.startsWith(`${container}/`) && !dir.slice(container.length + 1).includes("/")
    )
  );
  const conventionalModules = conventional.filter(hasSource);
  if (conventionalModules.length >= 2) {
    // Other top-level source directories are modules too (e.g. docs-site/, scripts/).
    const containers = new Set(CONVENTIONAL_CONTAINERS);
    const topLevel = [...directories].filter(
      (dir) => !dir.includes("/") && !containers.has(dir) && hasSource(dir)
    );
    return [...new Set([...conventionalModules, ...topLevel])].sort();
  }

  // 3. Top-level directories with source; with a single src/, split it one level down.
  const topLevel = [...directories].filter((dir) => !dir.includes("/") && hasSource(dir));
  if (topLevel.length === 1 && topLevel[0] === "src") {
    const children = [...directories].filter(
      (dir) => dir.startsWith("src/") && !dir.slice(4).includes("/") && hasSource(dir)
    );
    // Maven/Gradle source sets (src/main, src/test) are not modules.
    const sourceSets = /^src\/(main|test|androidTest|integrationTest|testFixtures)$/;
    if (children.length >= 2 && !children.every((dir) => sourceSets.test(dir))) return children.sort();
  }
  return topLevel.sort();
}

/** Longest module path containing the file, or "." for files outside every module. */
export function moduleOf(filePath: string, modules: string[]) {
  let best: string | null = null;
  for (const moduleDir of modules) {
    if (filePath.startsWith(`${moduleDir}/`) && (best === null || moduleDir.length > best.length)) {
      best = moduleDir;
    }
  }
  return best ?? ".";
}
