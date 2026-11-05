/**
 * Churn: how often each file changed in the available history. The analysis
 * clone is shallow (recent commits only), so this is *recent* churn, which is
 * what matters to spot where active work happens.
 */
import { execFileSync } from "child_process";

import { isExcludedFromLineCounts, resolveNumstatPath } from "../../contribution-stats.js";

export type ChurnStats = {
  commitsAnalyzed: number;
  contributors: number;
  /** path -> { commits touching it, lines added + deleted } */
  files: Map<string, { commits: number; linesChanged: number }>;
};

export function parseChurnLog(output: string): ChurnStats {
  const files = new Map<string, { commits: number; linesChanged: number }>();
  const authors = new Set<string>();
  let commitsAnalyzed = 0;

  for (const record of output.split("\x1e")) {
    if (!record.trim()) continue;
    const [header, ...lines] = record.split("\n");
    commitsAnalyzed++;
    const author = header.split("\x1f")[1]?.trim().toLowerCase();
    if (author) authors.add(author);

    for (const line of lines) {
      const [added, deleted, ...pathParts] = line.split("\t");
      if (pathParts.length === 0) continue;
      const filePath = resolveNumstatPath(pathParts.join("\t"));
      if (isExcludedFromLineCounts(filePath)) continue;

      const entry = files.get(filePath) ?? { commits: 0, linesChanged: 0 };
      entry.commits++;
      entry.linesChanged +=
        (Number.parseInt(added, 10) || 0) + (Number.parseInt(deleted, 10) || 0);
      files.set(filePath, entry);
    }
  }

  return { commitsAnalyzed, contributors: authors.size, files };
}

/** Commits considered for churn (the analysis clone also has --depth=50). */
export const CHURN_MAX_COMMITS = 50;

/**
 * Reads churn from a clone; returns empty stats when there is no git history or
 * when it takes too long. Rename detection is disabled: on commits touching
 * thousands of files (e.g. translations) it made `git log` take over a minute.
 */
export function readChurn(repoPath: string, timeoutMs = 20_000): ChurnStats {
  try {
    const output = execFileSync(
      "git",
      [
        "-C",
        repoPath,
        "log",
        `-n${CHURN_MAX_COMMITS}`,
        "--no-merges",
        "--no-renames",
        "--numstat",
        "--format=%x1e%H%x1f%aE",
      ],
      {
        encoding: "utf8",
        maxBuffer: 128 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
        timeout: timeoutMs,
      }
    );
    return parseChurnLog(output);
  } catch {
    return { commitsAnalyzed: 0, contributors: 0, files: new Map() };
  }
}
