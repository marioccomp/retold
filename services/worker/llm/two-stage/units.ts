/**
 * Map units: which source files each map call reads.
 *
 * The repository map (phase 1) already ranks files by import-graph centrality
 * and groups them into modules. A unit is a module's most central files,
 * rendered with their real line numbers (so claims can cite them) and cut to
 * the token budget of one call.
 */
import fs from "fs";
import path from "path";

import type { RepoMap } from "../../analyze/repo-map/index.js";
import { isGeneratedSource } from "../../analyze/repo-map/hygiene.js";
import { redactPreservingLines, SENSITIVE_PATH_PATTERN } from "../../privacy.js";
import { estimateTokens } from "../budget.js";

export type SourceExcerpt = {
  path: string;
  /** Lines of the whole file (redacted, same numbering as the original). */
  lines: string[];
  /** Highest line number included in the excerpt. */
  lastSentLine: number;
  /** Rendered text sent to the model. */
  text: string;
  tokens: number;
};

export type AnalysisUnit = {
  id: string;
  /** Module path from the repository map ("." for the root). */
  module: string;
  files: SourceExcerpt[];
  tokens: number;
};

const MAX_FILE_BYTES = 300_000;
const MAX_LINE_CHARS = 220;
const MAX_LINES_PER_FILE = 400;
/** Files whose excerpt would be smaller than this are not worth sending. */
const MIN_FILE_TOKENS = 120;

/** Reads a repository file for the LLM; null when it must not or cannot be sent. */
export function readSourceForLlm(repoPath: string, relativePath: string): string[] | null {
  if (SENSITIVE_PATH_PATTERN.test(relativePath)) return null;

  const absolute = path.join(repoPath, relativePath);
  let content: string;
  try {
    const stat = fs.statSync(absolute);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return null;
    content = fs.readFileSync(absolute, "utf8");
  } catch {
    return null;
  }

  if (content.includes("\u0000")) return null;
  if (isGeneratedSource(relativePath, content)) return null;

  return redactPreservingLines(content.replace(/\r\n?/g, "\n")).split("\n");
}

/**
 * Renders a file as "12| code" lines, skipping blank lines (numbers stay real),
 * until the token budget or the line cap is reached.
 */
export function renderExcerpt(
  relativePath: string,
  lines: string[],
  tokenBudget: number
): SourceExcerpt | null {
  const header = `### ${relativePath} (${lines.length} lines)`;
  const rendered: string[] = [header];
  let tokens = estimateTokens(header) + 1;
  let lastSentLine = 0;
  let sentLines = 0;

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index];
    if (raw.trim() === "") continue;

    const text = raw.length > MAX_LINE_CHARS ? `${raw.slice(0, MAX_LINE_CHARS)}…` : raw;
    const line = `${index + 1}| ${text}`;
    const lineTokens = estimateTokens(line) + 1;
    if (tokens + lineTokens > tokenBudget || sentLines >= MAX_LINES_PER_FILE) {
      rendered.push(`… (truncated after line ${lastSentLine})`);
      break;
    }

    rendered.push(line);
    tokens += lineTokens;
    lastSentLine = index + 1;
    sentLines++;
  }

  if (sentLines === 0) return null;
  return { path: relativePath, lines, lastSentLine, text: rendered.join("\n"), tokens };
}

/** Files to read per module, most central first. */
function rankFilesByModule(repoMap: RepoMap) {
  const byModule = new Map<string, { score: number; files: string[] }>();
  const add = (module: string, file: string, score: number) => {
    const entry = byModule.get(module) ?? { score: 0, files: [] };
    if (!entry.files.includes(file)) {
      entry.files.push(file);
      entry.score += score;
    }
    byModule.set(module, entry);
  };

  for (const file of repoMap.centralFiles) add(file.module, file.path, file.centrality);
  // Modules may have no globally central file (e.g. a leaf app), but their own key files matter.
  for (const module of repoMap.modules) {
    for (const file of module.keyFiles) add(module.path, file, 0);
  }

  // Without an import graph (unsupported language, flat scripts), fall back to churn.
  if (byModule.size === 0) {
    for (const file of repoMap.hotFiles) add(".", file.path, file.commits / 100);
  }

  return [...byModule.entries()]
    .map(([module, entry]) => ({ module, ...entry, peripheral: isPeripheralPath(module) }))
    .map((entry) => ({ ...entry, files: entry.files.filter((f) => !isPeripheralPath(f) || entry.peripheral) }))
    .filter((entry) => entry.files.length > 0)
    .sort(
      (a, b) =>
        Number(a.peripheral) - Number(b.peripheral) ||
        b.score - a.score ||
        b.files.length - a.files.length
    );
}

/**
 * Docs, examples, benchmarks and scripts are read last: in the eval they pulled
 * criticism of a tutorial and of a Sphinx config into a framework's review.
 */
export function isPeripheralPath(filePath: string) {
  return /(^|\/)(docs?|documentation|examples?|samples?|demos?|benchmarks?|bench|scripts|tools|fixtures|e2e)(\/|$)/i.test(
    filePath
  );
}

/**
 * Builds up to `maxUnits` units of at most `contentTokensPerUnit` tokens each.
 * One unit per module, in centrality order; spare units take the files that did
 * not fit (so a single-module repository can still use every call).
 */
export function buildAnalysisUnits(
  repoPath: string,
  repoMap: RepoMap,
  options: {
    maxUnits: number;
    contentTokensPerUnit: number;
    readFile?: (relativePath: string) => string[] | null;
  }
): AnalysisUnit[] {
  const readFile = options.readFile ?? ((file: string) => readSourceForLlm(repoPath, file));
  const budget = options.contentTokensPerUnit;
  // One huge file must not take the whole unit.
  const maxFileTokens = Math.max(MIN_FILE_TOKENS, Math.floor(budget * 0.6));

  const cache = new Map<string, string[] | null>();
  const read = (file: string) => {
    if (!cache.has(file)) cache.set(file, readFile(file));
    return cache.get(file) ?? null;
  };

  const units: AnalysisUnit[] = [];
  const used = new Set<string>();
  const leftovers: { module: string; file: string }[] = [];

  const fill = (unit: AnalysisUnit, candidates: { module: string; file: string }[]) => {
    for (const candidate of candidates) {
      if (used.has(candidate.file)) continue;
      const remaining = budget - unit.tokens;
      if (remaining < MIN_FILE_TOKENS) {
        leftovers.push(candidate);
        continue;
      }
      const lines = read(candidate.file);
      if (!lines) continue;
      const excerpt = renderExcerpt(candidate.file, lines, Math.min(remaining, maxFileTokens));
      if (!excerpt || excerpt.tokens < Math.min(MIN_FILE_TOKENS, remaining)) continue;
      unit.files.push(excerpt);
      unit.tokens += excerpt.tokens;
      used.add(candidate.file);
    }
  };

  for (const { module, files } of rankFilesByModule(repoMap)) {
    const candidates = files.map((file) => ({ module, file }));
    if (units.length >= options.maxUnits) {
      leftovers.push(...candidates);
      continue;
    }
    const unit: AnalysisUnit = { id: `u${units.length + 1}`, module, files: [], tokens: 0 };
    fill(unit, candidates);
    if (unit.files.length > 0) units.push(unit);
  }

  while (units.length < options.maxUnits) {
    const pending = leftovers.splice(0).filter((c) => !used.has(c.file));
    if (pending.length === 0) break;
    const unit: AnalysisUnit = {
      id: `u${units.length + 1}`,
      module: pending[0].module,
      files: [],
      tokens: 0,
    };
    fill(unit, pending);
    if (unit.files.length === 0) break;
    units.push(unit);
  }

  return units;
}
