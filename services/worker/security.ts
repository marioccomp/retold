import fs from "fs";
import os from "os";
import path from "path";

export const PROJECT_ANALYSIS_TMP_ROOT = path.join(os.tmpdir(), "retold");
export const USER_ANALYSIS_TMP_ROOT = path.join(os.tmpdir(), "retold-user-analysis");

const GITHUB_ALLOWED_HOSTS = new Set(["github.com", "www.github.com"]);

function normalizeResolvedPath(value: string) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function isPathInsideBase(candidatePath: string, basePath: string) {
  const normalizedCandidate = normalizeResolvedPath(candidatePath);
  const normalizedBase = normalizeResolvedPath(basePath);

  if (normalizedCandidate === normalizedBase) {
    return true;
  }

  const baseWithSeparator = normalizedBase.endsWith(path.sep)
    ? normalizedBase
    : `${normalizedBase}${path.sep}`;

  return normalizedCandidate.startsWith(baseWithSeparator);
}

export function assertPathInsideBase(
  candidatePath: string,
  basePath: string,
  label: string
) {
  if (!isPathInsideBase(candidatePath, basePath)) {
    throw new Error(`${label} escapes the allowed base directory`);
  }
}

export function parsePositiveSafeInteger(value: unknown, fieldName: string) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  throw new Error(`Invalid ${fieldName} in worker job payload`);
}

export function parseProjectId(value: unknown) {
  return parsePositiveSafeInteger(value, "projectId");
}

export function getProjectTempPath(basePath: string, projectId: number) {
  fs.mkdirSync(basePath, { recursive: true });

  const targetPath = path.join(basePath, String(projectId));
  assertPathInsideBase(targetPath, basePath, "Temporary repository path");

  return targetPath;
}

export function cleanupScopedDirectory(targetPath: string, basePath: string) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  assertPathInsideBase(targetPath, basePath, "Temporary repository cleanup path");
  fs.rmSync(targetPath, { recursive: true, force: true });
}

export function resolveRepositoryRoot(repoPath: string) {
  const realRoot = fs.realpathSync.native(repoPath);
  const stats = fs.statSync(realRoot);

  if (!stats.isDirectory()) {
    throw new Error("Repository root is not a directory");
  }

  return realRoot;
}

export function readRepositoryTextFile(repoPath: string, relativePath: string) {
  const repoRoot = resolveRepositoryRoot(repoPath);
  const candidatePath = path.resolve(repoRoot, relativePath);

  assertPathInsideBase(candidatePath, repoRoot, "Repository file path");

  const entryStats = fs.lstatSync(candidatePath);
  if (entryStats.isSymbolicLink()) {
    throw new Error(`Blocked symbolic link read for ${relativePath}`);
  }

  const realPath = fs.realpathSync.native(candidatePath);
  assertPathInsideBase(realPath, repoRoot, "Repository file real path");

  const fileStats = fs.statSync(realPath);
  if (!fileStats.isFile()) {
    throw new Error(`Repository path is not a file: ${relativePath}`);
  }

  return fs.readFileSync(realPath, "utf-8");
}

export function tryReadRepositoryTextFile(
  repoPath: string,
  relativePath: string,
  maxChars?: number
) {
  try {
    const content = readRepositoryTextFile(repoPath, relativePath);
    if (typeof maxChars === "number" && content.length > maxChars) {
      return content.slice(0, maxChars);
    }

    return content;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      return null;
    }

    throw error;
  }
}

export function validateGitHubRepositoryUrl(repoUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(repoUrl);
  } catch {
    throw new Error("Repository URL is not a valid URL");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Repository URL must use https");
  }

  if (!GITHUB_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("Repository URL host is not allowed");
  }

  const pathParts = parsed.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (pathParts.length < 2) {
    throw new Error("Repository URL must include owner and repository name");
  }

  const owner = pathParts[0];
  const repo = pathParts[1].replace(/\.git$/i, "");

  if (!owner || !repo) {
    throw new Error("Repository URL is missing owner or repository name");
  }

  return {
    owner,
    repo,
    normalizedUrl: `https://github.com/${owner}/${repo}`,
  };
}
