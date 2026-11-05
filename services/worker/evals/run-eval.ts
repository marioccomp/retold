/**
 * Eval runner for the repository analysis.
 *
 *   pnpm eval                  heuristics only (free, no LLM calls)
 *   pnpm eval --llm            full pipeline, including the configured LLM
 *   pnpm eval --case flask     run a single case (repeatable)
 *
 * Each case pins a repository to a commit SHA, so results are reproducible.
 * Reports are written to services/worker/evals/results/ (git-ignored).
 * See evals/README.md for how to add cases.
 */
import "./quiet-logs.js";

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import { analyzeRepository } from "../analyze/index.js";
import { runGitCommand } from "../clone.js";
import { getDefaultLlmProvider, LlmProvider, LlmRateLimitError, LlmUsage } from "../llm/index.js";
import { runAnalysisPipeline, readRepositoryReadme } from "../pipeline.js";
import { buildLlmPrivacyDecision } from "../privacy.js";

type EvalExpectations = {
  primaryLanguage?: string;
  purpose?: string[];
  domain?: string[];
  appType?: string[];
  frameworksInclude?: string[];
  /** Regexes (case-insensitive); each must match the LLM output. */
  llmMustMention?: string[];
  /** Regexes (case-insensitive); none may match the LLM output. */
  llmMustNotMention?: string[];
  /** Repository map (phase 1): module paths that must be detected. */
  modulesInclude?: string[];
  /** Repository map: each regex must match one of the 10 most central files. */
  centralFilesInclude?: string[];
  /** Repository map: hygiene flags that must be raised (e.g. "node_modules"). */
  hygieneFlags?: string[];
  /** Repository map: accepted measured maturity levels. */
  maturity?: string[];
};

type EvalCase = {
  id: string;
  repo: string;
  ref: string;
  notes?: string;
  expect: EvalExpectations;
};

type CheckResult = { name: string; pass: boolean; expected: string; actual: string };

type CaseResult = {
  id: string;
  repo: string;
  checks: CheckResult[];
  durationMs: number;
  usage: LlmUsage | null;
  error?: string;
  /** Raw LLM answer (JSON report only), to understand failed text checks. */
  llmOutput?: unknown;
};

const evalsDir = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.join(evalsDir, "results");
const cacheRoot = path.join(os.tmpdir(), "retold-eval-repos");

function parseArgs(argv: string[]) {
  const caseIds: string[] = [];
  let llm = false;
  let locale = "en";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--llm") llm = true;
    else if (arg === "--case") caseIds.push(argv[++i]);
    else if (arg === "--locale") locale = argv[++i];
    else if (arg === "--") continue;
    else throw new Error(`Unknown argument "${arg}"`);
  }

  return { caseIds, llm, locale };
}

/** Same history depth as the production analysis clone (churn, history signals). */
const EVAL_CLONE_DEPTH = 50;

/** Shallow checkout of exactly `ref` (with recent history), cached across runs. */
async function checkoutCase(evalCase: EvalCase) {
  const target = path.join(cacheRoot, `${evalCase.id}@${evalCase.ref.slice(0, 12)}`);
  const marker = path.join(target, ".git", `retold-eval-depth-${EVAL_CLONE_DEPTH}`);
  if (fs.existsSync(marker)) return target;

  const url = `https://github.com/${evalCase.repo}.git`;
  if (!fs.existsSync(path.join(target, ".git"))) {
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(target, { recursive: true });
    await runGitCommand(["-C", target, "init", "-q"]);
  }
  // Also deepens checkouts cached by older runs (which used --depth=1).
  await runGitCommand(["-C", target, "fetch", "-q", `--depth=${EVAL_CLONE_DEPTH}`, url, evalCase.ref], {
    timeoutMs: 300_000,
  });
  await runGitCommand(["-C", target, "-c", "core.longpaths=true", "checkout", "-q", "-f", evalCase.ref], {
    timeoutMs: 180_000,
  });
  fs.writeFileSync(marker, "");
  return target;
}

/** Wraps a provider to add up token usage across calls. */
function withUsageTracking(provider: LlmProvider) {
  const usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };
  let calls = 0;
  const tracked: LlmProvider = {
    name: provider.name,
    model: provider.model,
    async complete(request) {
      const completion = await provider.complete(request);
      calls++;
      if (completion.usage) {
        usage.inputTokens += completion.usage.inputTokens;
        usage.outputTokens += completion.usage.outputTokens;
      }
      return completion;
    },
  };
  return { tracked, usage, getCalls: () => calls };
}

function check(name: string, pass: boolean, expected: unknown, actual: unknown): CheckResult {
  const show = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value));
  return { name, pass, expected: show(expected), actual: show(actual) };
}

function heuristicChecks(
  expect: EvalExpectations,
  analysis: Awaited<ReturnType<typeof analyzeRepository>>
) {
  const checks: CheckResult[] = [];
  const { classification, summary, stack } = analysis;

  if (expect.primaryLanguage) {
    checks.push(
      check(
        "primaryLanguage",
        summary.primaryLanguage === expect.primaryLanguage,
        expect.primaryLanguage,
        summary.primaryLanguage
      )
    );
  }
  if (expect.purpose) {
    checks.push(
      check("purpose", expect.purpose.includes(classification.purpose), expect.purpose, classification.purpose)
    );
  }
  if (expect.domain) {
    checks.push(
      check("domain", expect.domain.includes(classification.domain), expect.domain, classification.domain)
    );
  }
  if (expect.appType) {
    checks.push(check("appType", expect.appType.includes(summary.appType), expect.appType, summary.appType));
  }
  for (const framework of expect.frameworksInclude ?? []) {
    checks.push(
      check(`framework:${framework}`, stack.frameworks.includes(framework), framework, stack.frameworks)
    );
  }

  const { repoMap } = analysis;
  const modulePaths = repoMap.modules.map((m) => m.path);
  for (const modulePath of expect.modulesInclude ?? []) {
    checks.push(check(`module:${modulePath}`, modulePaths.includes(modulePath), modulePath, modulePaths));
  }
  const topCentral = repoMap.centralFiles.slice(0, 10).map((f) => f.path);
  for (const pattern of expect.centralFilesInclude ?? []) {
    const regex = new RegExp(pattern);
    checks.push(
      check(`central:/${pattern}/`, topCentral.some((f) => regex.test(f)), pattern, topCentral.slice(0, 5))
    );
  }
  for (const flag of expect.hygieneFlags ?? []) {
    checks.push(
      check(`hygiene:${flag}`, repoMap.hygiene.flags.includes(flag as never), flag, repoMap.hygiene.flags)
    );
  }
  if (expect.maturity) {
    checks.push(
      check(
        "maturity",
        expect.maturity.includes(repoMap.maturity.level),
        expect.maturity,
        `${repoMap.maturity.level} (${repoMap.maturity.score})`
      )
    );
  }

  return checks;
}

function llmChecks(expect: EvalExpectations, llmInsights: unknown) {
  const checks: CheckResult[] = [];
  const text = JSON.stringify(llmInsights ?? {});

  checks.push(
    check(
      "llm:validJson",
      typeof llmInsights === "object" && llmInsights !== null,
      "object",
      typeof llmInsights
    )
  );

  for (const pattern of expect.llmMustMention ?? []) {
    checks.push(check(`llm:mentions /${pattern}/`, new RegExp(pattern, "i").test(text), "match", "no match"));
  }
  for (const pattern of expect.llmMustNotMention ?? []) {
    const matched = text.match(new RegExp(pattern, "i"));
    checks.push(
      check(`llm:avoids /${pattern}/`, !matched, "no match", matched ? `"${matched[0]}"` : "no match")
    );
  }

  // Fix the "actual" of passing mention checks for a cleaner report.
  return checks.map((c) => (c.name.startsWith("llm:mentions") && c.pass ? { ...c, actual: "match" } : c));
}

async function runCase(
  evalCase: EvalCase,
  options: { llm: boolean; locale: string; provider: LlmProvider | null }
): Promise<CaseResult> {
  const startedAt = Date.now();
  const repoPath = await checkoutCase(evalCase);
  const privacyDecision = buildLlmPrivacyDecision({
    projectVisibility: "public",
    repositoryPrivate: false,
  });
  const repoUrl = `https://github.com/${evalCase.repo}`;

  if (!options.llm || !options.provider) {
    const readme = readRepositoryReadme(repoPath);
    const analysis = await analyzeRepository(repoPath, {
      readme,
      repoUrl,
      includeCodeSamples: privacyDecision.includeCodeSamples,
    });
    return {
      id: evalCase.id,
      repo: evalCase.repo,
      checks: heuristicChecks(evalCase.expect, analysis),
      durationMs: Date.now() - startedAt,
      usage: null,
    };
  }

  const { tracked, usage } = withUsageTracking(options.provider);
  const result = await runAnalysisPipeline({
    repoPath,
    repoUrl,
    repoName: evalCase.repo.split("/")[1],
    locale: options.locale,
    privacyDecision,
    provider: tracked,
  });

  return {
    id: evalCase.id,
    repo: evalCase.repo,
    checks: [
      ...heuristicChecks(evalCase.expect, result.analysis),
      ...llmChecks(evalCase.expect, result.llmInsights),
    ],
    durationMs: Date.now() - startedAt,
    usage,
    llmOutput: result.llmInsights,
  };
}

const MAX_RATE_LIMIT_WAIT_MS = 120_000;

/** Free tiers rate-limit quickly; wait what the provider asks (bounded) and retry. */
async function runCaseWaitingOnRateLimits(
  evalCase: EvalCase,
  options: { llm: boolean; locale: string; provider: LlmProvider | null },
  retriesLeft = 3
): Promise<CaseResult> {
  try {
    return await runCase(evalCase, options);
  } catch (error) {
    if (!(error instanceof LlmRateLimitError) || retriesLeft === 0) throw error;

    const waitMs = Math.min(error.retryAfterMs ?? 60_000, MAX_RATE_LIMIT_WAIT_MS);
    process.stdout.write(`rate limited, waiting ${Math.ceil(waitMs / 1000)}s … `);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return runCaseWaitingOnRateLimits(evalCase, options, retriesLeft - 1);
  }
}

function buildMarkdownReport(
  results: CaseResult[],
  meta: { mode: string; provider: string; startedAt: Date }
) {
  const allChecks = results.flatMap((r) => r.checks);
  const passed = allChecks.filter((c) => c.pass).length;
  const tokensIn = results.reduce((sum, r) => sum + (r.usage?.inputTokens ?? 0), 0);
  const tokensOut = results.reduce((sum, r) => sum + (r.usage?.outputTokens ?? 0), 0);

  const lines = [
    `# Eval — ${meta.startedAt.toISOString()}`,
    "",
    `- Mode: **${meta.mode}**${meta.mode === "llm" ? ` (${meta.provider})` : ""}`,
    `- Checks: **${passed}/${allChecks.length}** passed`,
    `- Cases with errors: ${results.filter((r) => r.error).length}`,
    ...(meta.mode === "llm" ? [`- Tokens: ${tokensIn} in / ${tokensOut} out`] : []),
    "",
    "| Case | Check | Result | Expected | Actual |",
    "|---|---|---|---|---|",
  ];

  for (const result of results) {
    if (result.error) {
      lines.push(`| ${result.id} | — | ERROR | — | ${result.error.replace(/\|/g, "\\|")} |`);
      continue;
    }
    for (const c of result.checks) {
      lines.push(
        `| ${result.id} | ${c.name.replace(/\|/g, "\\|")} | ${c.pass ? "✅" : "❌"} | ${c.expected.replace(/\|/g, "\\|")} | ${c.actual.replace(/\|/g, "\\|")} |`
      );
    }
  }

  return lines.join("\n") + "\n";
}

async function main() {
  const { caseIds, llm, locale } = parseArgs(process.argv.slice(2));
  const allCases: EvalCase[] = JSON.parse(
    fs.readFileSync(path.join(evalsDir, "cases.json"), "utf8")
  );
  const cases = caseIds.length > 0 ? allCases.filter((c) => caseIds.includes(c.id)) : allCases;

  const unknownIds = caseIds.filter((id) => !allCases.some((c) => c.id === id));
  if (unknownIds.length > 0) throw new Error(`Unknown case(s): ${unknownIds.join(", ")}`);

  const provider = llm ? getDefaultLlmProvider() : null;
  const startedAt = new Date();
  const results: CaseResult[] = [];

  for (const evalCase of cases) {
    process.stdout.write(`• ${evalCase.id} … `);
    try {
      const result = await runCaseWaitingOnRateLimits(evalCase, { llm, locale, provider });
      results.push(result);
      const failed = result.checks.filter((c) => !c.pass);
      console.log(
        failed.length === 0
          ? `ok (${result.checks.length} checks, ${result.durationMs}ms)`
          : `FAIL ${failed.map((c) => `${c.name}: expected ${c.expected}, got ${c.actual}`).join("; ")}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ id: evalCase.id, repo: evalCase.repo, checks: [], durationMs: 0, usage: null, error: message });
      console.log(`ERROR ${message}`);
    }
  }

  const mode = llm ? "llm" : "heuristics";
  const providerLabel = provider ? `${provider.name}/${provider.model}` : "none";
  const report = buildMarkdownReport(results, { mode, provider: providerLabel, startedAt });

  fs.mkdirSync(resultsDir, { recursive: true });
  const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(resultsDir, `${stamp}-${mode}.md`), report);
  fs.writeFileSync(
    path.join(resultsDir, `${stamp}-${mode}.json`),
    JSON.stringify({ mode, provider: providerLabel, startedAt, results }, null, 2)
  );

  const allChecks = results.flatMap((r) => r.checks);
  const failedChecks = allChecks.filter((c) => !c.pass).length;
  const erroredCases = results.filter((r) => r.error).length;
  console.log(
    `\n${allChecks.length - failedChecks}/${allChecks.length} checks passed` +
      (erroredCases ? `, ${erroredCases} case(s) errored` : "") +
      `. Report: services/worker/evals/results/${stamp}-${mode}.md`
  );

  process.exitCode = failedChecks > 0 || erroredCases > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
