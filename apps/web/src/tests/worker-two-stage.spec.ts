import { describe, expect, it } from "vitest";

import type { RepoMap } from "../../../../services/worker/analyze/repo-map/index";
import { BudgetedProvider, estimateTokens, readLlmBudget } from "../../../../services/worker/llm/budget";
import { LlmCompletionRequest, LlmProvider, LlmRateLimitError } from "../../../../services/worker/llm/provider";
import { applyCheckVerdicts, planClaimCheck } from "../../../../services/worker/llm/two-stage/check";
import { buildMeasuredFacts, measuredScores } from "../../../../services/worker/llm/two-stage/facts";
import {
  assembleOverview,
  evidenceUrl,
  githubWebUrl,
  runTwoStageAnalysis,
  TwoStageInput,
} from "../../../../services/worker/llm/two-stage/run";
import { parseMapOutput, parseReduceOutput } from "../../../../services/worker/llm/two-stage/schemas";
import {
  AnalysisUnit,
  buildAnalysisUnits,
  isPeripheralPath,
  renderExcerpt,
  SourceExcerpt,
} from "../../../../services/worker/llm/two-stage/units";
import { validateClaim, validateClaims, VerifiedClaim } from "../../../../services/worker/llm/two-stage/validate";
import { buildLlmPrivacyDecision, redactPreservingLines } from "../../../../services/worker/privacy";

// ---------- fixtures ----------

const QUEUE_SOURCE = [
  'import { Queue } from "bullmq";',
  "",
  "export async function retryWithBackoff(job: Job) {",
  "  const delay = 2 ** job.attempts * 1000;",
  "  return queue.add(job.name, job.data, { delay });",
  "}",
  "",
  "export class JobRunner {",
  "  run() {",
  "    return retryWithBackoff(this.job);",
  "  }",
  "}",
].join("\n");

function excerptOf(path: string, source: string, budget = 10_000): SourceExcerpt {
  const excerpt = renderExcerpt(path, source.split("\n"), budget);
  if (!excerpt) throw new Error("empty excerpt");
  return excerpt;
}

function unitOf(files: SourceExcerpt[], id = "u1", module = "src"): AnalysisUnit {
  return { id, module, files, tokens: files.reduce((sum, f) => sum + f.tokens, 0) };
}

function repoMapFixture(overrides: Partial<RepoMap> = {}): RepoMap {
  return {
    version: 1,
    modules: [
      {
        path: "src",
        files: 3,
        sourceFiles: 3,
        testFiles: 1,
        loc: 300,
        languages: ["TypeScript"],
        keyFiles: ["src/queue.ts"],
        externalDependencies: ["bullmq"],
        dependsOn: [],
      },
    ],
    centralFiles: [
      { path: "src/queue.ts", module: "src", loc: 12, fanIn: 4, fanOut: 1, centrality: 1, recentCommits: 2 },
    ],
    hotFiles: [],
    graph: { nodes: 3, edges: 2, resolvedImports: 2, unresolvedImports: 0, externalDependencies: [] },
    history: { commitsAnalyzed: 20, contributors: 2 },
    generatedFiles: { count: 0, examples: [] },
    hygiene: { flags: [], counts: {}, examples: {} },
    maturity: {
      score: 70,
      level: "high",
      breakdown: [
        { signal: "tests", points: 20, max: 25, evidence: "10 test files for 30 source files (33%)" },
        { signal: "ci", points: 20, max: 20, evidence: "github-actions running tests" },
        { signal: "lint", points: 10, max: 10, evidence: "eslint" },
        { signal: "types", points: 10, max: 10, evidence: "type-checked" },
        { signal: "container", points: 0, max: 5, evidence: "not containerized" },
        { signal: "docs", points: 5, max: 10, evidence: "README with 900 chars" },
        { signal: "history", points: 5, max: 10, evidence: "20 recent commits, 2 contributor(s)" },
        { signal: "hygiene", points: 0, max: 10, evidence: "committed: node_modules" },
      ],
    },
    ...overrides,
  };
}

const analysisFixture = {
  summary: { primaryLanguage: "TypeScript", appType: "Backend" },
  stack: { languages: ["TypeScript"], frameworks: ["Express"], tools: [] as string[] },
  infra: {
    hasDockerfile: false,
    hasCompose: false,
    ciProviders: ["github-actions"],
    lintTools: ["eslint"],
    testTools: ["vitest"],
    hasTests: true,
    hasKubernetes: false,
    hasTerraform: false,
  },
  stats: { totalFiles: 40, sourceFiles: 30, testFiles: 10, configFiles: 0, docsFiles: 0, unknownFiles: 0 },
  classification: {
    domain: "web" as const,
    purpose: "production" as const,
    languageFamily: "web" as const,
    maturityExpectation: "medium" as const,
    confidence: 0.7,
    signals: [],
  },
  repoMap: repoMapFixture({
    hygiene: { flags: ["node_modules"], counts: { node_modules: 2107 }, examples: {} },
  }),
};

const verifiedClaim = (overrides: Partial<VerifiedClaim> = {}): VerifiedClaim => ({
  id: "c1",
  unitId: "u1",
  module: "src",
  kind: "notable",
  text: "Retries jobs with exponential backoff.",
  file: "src/queue.ts",
  startLine: 3,
  endLine: 6,
  symbol: "retryWithBackoff",
  status: "verified",
  ...overrides,
});

type Clock = { now: () => number; sleep: (ms: number) => Promise<void> };

function fakeClock(): Clock & { slept: number[] } {
  let time = 0;
  const slept: number[] = [];
  return {
    slept,
    now: () => time,
    sleep: async (ms) => {
      slept.push(ms);
      time += ms;
    },
  };
}

function scriptedProvider(results: Array<string | Error | ((r: LlmCompletionRequest) => string)>) {
  const requests: LlmCompletionRequest[] = [];
  const provider: LlmProvider = {
    name: "fake",
    model: "fake-model",
    async complete(request) {
      requests.push(request);
      const next = results.shift();
      if (next === undefined) throw new Error("No scripted result left");
      if (next instanceof Error) throw next;
      const text = typeof next === "function" ? next(request) : next;
      return { text, model: "fake-model", usage: { inputTokens: 100, outputTokens: 50 } };
    },
  };
  return { provider, requests };
}

// ---------- budget ----------

describe("readLlmBudget", () => {
  it("defaults to Groq's free tier and treats 0 tokens/min as unlimited", () => {
    expect(readLlmBudget({} as unknown as NodeJS.ProcessEnv).tokensPerMinute).toBe(8000);
    expect(readLlmBudget({ LLM_TOKENS_PER_MINUTE: "0" } as unknown as NodeJS.ProcessEnv).tokensPerMinute).toBeNull();
    expect(readLlmBudget({ LLM_MAX_MAP_CALLS: "5" } as unknown as NodeJS.ProcessEnv).maxMapCalls).toBe(5);
  });
});

describe("BudgetedProvider", () => {
  const request = (chars: number, maxOutputTokens = 1000): LlmCompletionRequest => ({
    messages: [{ role: "user", content: "x".repeat(chars) }],
    maxOutputTokens,
  });

  it("waits for the rolling minute instead of exceeding the token budget", async () => {
    const clock = fakeClock();
    const { provider } = scriptedProvider(["{}", "{}"]);
    const budgeted = new BudgetedProvider(provider, { tokensPerMinute: 5000, clock });

    // ~3000 + 1000 reserved each: the second call cannot start in the same minute.
    await budgeted.complete(request(10_500));
    await budgeted.complete(request(10_500));

    expect(clock.slept.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(60_000);
    expect(budgeted.calls).toHaveLength(2);
    expect(budgeted.usage).toEqual({ inputTokens: 200, outputTokens: 100 });
  });

  it("retries short rate-limit waits in place", async () => {
    const clock = fakeClock();
    const { provider, requests } = scriptedProvider([new LlmRateLimitError("tpm", 7000), "{}"]);
    const budgeted = new BudgetedProvider(provider, { tokensPerMinute: null, clock });

    await budgeted.complete(request(100));

    expect(requests).toHaveLength(2);
    expect(clock.slept).toContain(7000);
  });

  it("rethrows long rate limits so the worker reschedules the analysis", async () => {
    const limit = new LlmRateLimitError("daily", 3_600_000);
    const { provider } = scriptedProvider([limit]);
    const budgeted = new BudgetedProvider(provider, { tokensPerMinute: null, clock: fakeClock() });

    await expect(budgeted.complete(request(100))).rejects.toBe(limit);
  });

  it("refuses a request that can never fit the per-minute budget", async () => {
    const { provider } = scriptedProvider([]);
    const budgeted = new BudgetedProvider(provider, { tokensPerMinute: 1000, clock: fakeClock() });

    await expect(budgeted.complete(request(10_000))).rejects.toThrow(/tokens\/min budget/);
  });
});

// ---------- privacy ----------

describe("redactPreservingLines", () => {
  it("redacts secrets without shifting line numbers", () => {
    const source = [
      "const a = 1;",
      "-----BEGIN RSA PRIVATE KEY-----",
      "abc",
      "-----END RSA PRIVATE KEY-----",
      "API_KEY=supersecret",
      "const b = 2;",
    ].join("\n");

    const redacted = redactPreservingLines(source).split("\n");
    expect(redacted).toHaveLength(6);
    expect(redacted[2]).toBe("[REDACTED_PRIVATE_KEY_BLOCK]");
    expect(redacted[4]).toBe("API_KEY=[REDACTED]");
    expect(redacted[5]).toBe("const b = 2;");
  });
});

// ---------- units ----------

describe("renderExcerpt", () => {
  it("numbers lines with their real position and omits blank lines", () => {
    const excerpt = excerptOf("src/queue.ts", QUEUE_SOURCE);
    expect(excerpt.text).toContain("3| export async function retryWithBackoff");
    expect(excerpt.text).not.toMatch(/^2\| /m);
    expect(excerpt.lastSentLine).toBe(12);
  });

  it("stops at the token budget and says where it stopped", () => {
    const excerpt = excerptOf("src/queue.ts", QUEUE_SOURCE, estimateTokens("### src/queue.ts (12 lines)") + 25);
    expect(excerpt.lastSentLine).toBeLessThan(12);
    expect(excerpt.text).toMatch(/truncated after line \d+/);
  });
});

describe("buildAnalysisUnits", () => {
  const source = Array.from({ length: 80 }, (_, i) => `export const value${i} = computeSomething(${i});`).join("\n");

  const repoMap = repoMapFixture({
    modules: [
      { ...repoMapFixture().modules[0], path: "docs", keyFiles: ["docs/conf.py"] },
      { ...repoMapFixture().modules[0], path: "src", keyFiles: ["src/a.ts", "src/b.ts", "src/c.ts"] },
    ],
    centralFiles: [
      { path: "docs/conf.py", module: "docs", loc: 80, fanIn: 9, fanOut: 0, centrality: 1, recentCommits: 0 },
      { path: "src/a.ts", module: "src", loc: 80, fanIn: 5, fanOut: 1, centrality: 0.5, recentCommits: 0 },
    ],
  });

  it("reads core modules before docs and examples, within the budget", () => {
    const units = buildAnalysisUnits("/repo", repoMap, {
      maxUnits: 1,
      contentTokensPerUnit: 2000,
      readFile: () => source.split("\n"),
    });

    expect(units).toHaveLength(1);
    expect(units[0].module).toBe("src");
    expect(units[0].tokens).toBeLessThanOrEqual(2000);
  });

  it("uses spare calls for files that did not fit the first unit", () => {
    const units = buildAnalysisUnits("/repo", repoMap, {
      maxUnits: 3,
      contentTokensPerUnit: 1000,
      readFile: () => source.split("\n"),
    });

    const files = units.flatMap((u) => u.files.map((f) => f.path));
    expect(units.length).toBeGreaterThan(1);
    expect(new Set(files).size).toBe(files.length);
    expect(files).toContain("src/b.ts");
  });

  it("skips files that cannot be read (sensitive, generated, binary)", () => {
    const units = buildAnalysisUnits("/repo", repoMap, {
      maxUnits: 3,
      contentTokensPerUnit: 2000,
      readFile: () => null,
    });
    expect(units).toEqual([]);
  });

  it("classifies peripheral paths", () => {
    expect(isPeripheralPath("examples/tutorial/auth.py")).toBe(true);
    expect(isPeripheralPath("docs/conf.py")).toBe(true);
    expect(isPeripheralPath("src/flask/app.py")).toBe(false);
  });
});

// ---------- validation ----------

describe("validateClaim", () => {
  const files = new Map([["src/queue.ts", excerptOf("src/queue.ts", QUEUE_SOURCE)]]);
  const claim = {
    kind: "notable" as const,
    text: "Retries jobs with exponential backoff.",
    file: "src/queue.ts",
    startLine: 3,
    endLine: 6,
    symbol: "retryWithBackoff",
  };

  it("accepts a claim whose symbol is in the cited lines", () => {
    expect(validateClaim(claim, files)).toMatchObject({ ok: true, status: "verified", startLine: 3, endLine: 6 });
  });

  it("normalizes paths and call syntax", () => {
    expect(validateClaim({ ...claim, file: "./src/queue.ts", symbol: "`retryWithBackoff()`" }, files)).toMatchObject({
      ok: true,
      symbol: "retryWithBackoff",
    });
  });

  it("reanchors a citation to where the symbol really is", () => {
    const result = validateClaim({ ...claim, symbol: "JobRunner", startLine: 1, endLine: 2 }, files);
    expect(result).toMatchObject({ ok: true, status: "reanchored", startLine: 8 });
  });

  it("accepts the last segment of a qualified name", () => {
    expect(validateClaim({ ...claim, symbol: "Scheduler.retryWithBackoff" }, files)).toMatchObject({ ok: true });
  });

  it.each([
    [{ symbol: "notThere" }, "symbol_not_found"],
    [{ file: "src/other.ts" }, "file_not_sent"],
    [{ symbol: "return" }, "weak_symbol"],
    [{ startLine: 400, endLine: 410 }, "lines_out_of_range"],
  ])("rejects %o as %s", (override, reason) => {
    expect(validateClaim({ ...claim, ...override }, files)).toEqual({ ok: false, reason });
  });

  it("drops duplicates and numbers the survivors", () => {
    let n = 0;
    const { verified, rejected } = validateClaims(
      [claim, { ...claim }, { ...claim, symbol: "missing" }],
      unitOf([...files.values()]),
      () => `c${++n}`
    );
    expect(verified.map((c) => c.id)).toEqual(["c1"]);
    expect(rejected.map((r) => r.reason)).toEqual(["duplicate", "symbol_not_found"]);
  });
});

describe("claim check", () => {
  const files = new Map([["src/queue.ts", excerptOf("src/queue.ts", QUEUE_SOURCE)]]);
  const claims = [
    verifiedClaim({ id: "c1", kind: "responsibility" }),
    verifiedClaim({ id: "c2", kind: "pattern" }),
    verifiedClaim({ id: "c3", kind: "risk" }),
  ];

  it("checks risks first and never spends budget on responsibilities", () => {
    const plan = planClaimCheck(claims, files, 2000);
    expect(plan.ids).toEqual(["c3", "c2"]);
    expect(plan.messages?.[1].content).toContain("3| export async function retryWithBackoff");
  });

  it("drops refuted claims and risks nobody confirmed", () => {
    const { kept, refuted, uncheckedRisks } = applyCheckVerdicts(
      claims,
      ["c2", "c3"],
      new Map([["c2", false]])
    );
    expect(kept.map((c) => c.id)).toEqual(["c1"]);
    expect(refuted).toBe(1);
    expect(uncheckedRisks).toBe(1);
  });

  it("marks confirmed claims as checked", () => {
    const { kept } = applyCheckVerdicts(claims, ["c3"], new Map([["c3", true]]));
    expect(kept.find((c) => c.id === "c3")?.checked).toBe(true);
  });
});

// ---------- schemas ----------

describe("output parsing", () => {
  it("keeps valid claims and counts the malformed ones", () => {
    const parsed = parseMapOutput({
      summary: "Queue layer.",
      claims: [
        { kind: "pattern", text: "Uses a job queue.", file: "a.ts", startLine: "3", endLine: 5, symbol: "Queue" },
        { kind: "opinion", text: "Nice code overall.", file: "a.ts", startLine: 1, endLine: 2, symbol: "x" },
      ],
    });
    expect(parsed?.claims).toHaveLength(1);
    expect(parsed?.claims[0].startLine).toBe(3);
    expect(parsed?.invalid).toBe(1);
  });

  it("requires summary paragraphs in the reduce answer", () => {
    expect(parseReduceOutput({ summary: { title: "x", paragraphs: [] } })).toBeNull();
  });
});

// ---------- facts, scores and assembly ----------

describe("measured facts and scores", () => {
  it("exposes measured signals as citable facts", () => {
    const facts = buildMeasuredFacts(analysisFixture);
    expect(facts[0].id).toBe("f1");
    expect(facts.map((f) => f.text).join(" ")).toContain("node_modules (2107 files)");
  });

  it("scores testing, devops and documentation without a model", () => {
    const scores = Object.fromEntries(measuredScores(repoMapFixture()).map((s) => [s.axis, s.score]));
    expect(scores).toEqual({ testing: 83, devops: 80, documentation: 50 });
  });
});

describe("assembleOverview", () => {
  const facts = buildMeasuredFacts(analysisFixture);
  const claims = [verifiedClaim()];
  const reduce = parseReduceOutput({
    summary: { title: "Job runner", paragraphs: ["A job runner that retries failed work with backoff."] },
    architecture: { explanation: "Single module.", refs: ["c1", "f4", "zz"] },
    strengths: [
      { name: "Backoff", explanation: "Retries with exponential backoff.", refs: ["c1"] },
      { name: "Invented", explanation: "Something without support.", refs: ["c99"] },
    ],
    suggestions: [{ name: "Ignore node_modules", explanation: "Stop committing dependencies.", refs: ["F9"] }],
    scores: {
      architecture: { score: 4, rationale: "Clear queue layer.", refs: ["c1"] },
      security: { score: 2, rationale: "Only a fact.", refs: ["f1"] },
    },
  })!;

  const { overview } = assembleOverview({
    reduce,
    claims,
    facts,
    analysis: analysisFixture,
    webUrl: "https://github.com/acme/jobs",
    commitSha: "a".repeat(40),
    locale: "pt-BR",
    privacyMode: "metadata+sanitized-readme+sanitized-samples",
  });

  it("keeps only items backed by known ids and links code evidence to the commit", () => {
    expect(overview.strengths.map((s) => s.name)).toEqual(["Backoff"]);
    expect(overview.strengths[0].evidence[0]).toMatchObject({
      type: "code",
      url: `https://github.com/acme/jobs/blob/${"a".repeat(40)}/src/queue.ts#L3-L6`,
    });
    expect(overview.suggestions).toHaveLength(1);
    expect(overview.architecture.evidence).toHaveLength(2);
    expect(overview.language).toBe("pt-BR");
  });

  it("drops model scores that no verified code claim supports", () => {
    const axes = overview.scores.map((s) => `${s.axis}:${s.source}`);
    expect(axes).toEqual(["architecture:llm", "testing:measured", "devops:measured", "documentation:measured"]);
    expect(overview.scores[0].score).toBe(80);
  });
});

describe("permalinks", () => {
  it("builds GitHub web URLs from clone URLs", () => {
    expect(githubWebUrl("https://github.com/acme/jobs.git")).toBe("https://github.com/acme/jobs");
    expect(githubWebUrl("git@github.com:acme/jobs.git")).toBe("https://github.com/acme/jobs");
    expect(githubWebUrl("https://gitlab.com/acme/jobs")).toBeNull();
  });

  it("encodes paths and uses a single-line anchor when needed", () => {
    const url = evidenceUrl(
      "https://github.com/acme/jobs",
      "b".repeat(40),
      verifiedClaim({ file: "src/my file.ts", startLine: 7, endLine: 7 })
    );
    expect(url).toBe(`https://github.com/acme/jobs/blob/${"b".repeat(40)}/src/my%20file.ts#L7`);
  });
});

// ---------- end to end (scripted model) ----------

describe("runTwoStageAnalysis", () => {
  const unit = unitOf([excerptOf("src/queue.ts", QUEUE_SOURCE)]);
  const unlimited = {
    tokensPerMinute: null,
    maxInputTokensPerCall: 6000,
    maxOutputTokensMap: 800,
    maxOutputTokensReduce: 800,
    maxOutputTokensCheck: 400,
    maxMapCalls: 2,
  };

  const mapAnswer = JSON.stringify({
    summary: "Job queue with retries.",
    claims: [
      { kind: "notable", text: "Retries with backoff.", file: "src/queue.ts", startLine: 3, endLine: 6, symbol: "retryWithBackoff" },
      { kind: "risk", text: "Unbounded retries.", file: "src/queue.ts", startLine: 4, endLine: 4, symbol: "attempts" },
      { kind: "pattern", text: "Made up.", file: "src/queue.ts", startLine: 1, endLine: 3, symbol: "nonexistent" },
    ],
  });
  const checkAnswer = JSON.stringify({ results: [{ id: "c2", supported: false }, { id: "c1", supported: true }] });
  const reduceAnswer = (request: LlmCompletionRequest) => {
    // The refuted risk (c2) must not reach the reduce prompt.
    const prompt = request.messages[1].content;
    if (prompt.includes("c2 [risk]")) throw new Error("refuted claim leaked into reduce");
    return JSON.stringify({
      summary: { title: "Jobs", paragraphs: ["A job runner that retries failed work with backoff and a queue."] },
      architecture: { explanation: "One module.", refs: ["c1"] },
      strengths: [{ name: "Backoff", explanation: "Retries with exponential backoff.", refs: ["c1"] }],
      suggestions: [],
      scores: { architecture: { score: 4, rationale: "Clear.", refs: ["c1"] }, security: null },
    });
  };

  const baseInput = (provider: LlmProvider, overrides: Partial<TwoStageInput> = {}): TwoStageInput => ({
    repoPath: "/repo",
    repoName: "jobs",
    repoUrl: "https://github.com/acme/jobs",
    commitSha: "c".repeat(40),
    locale: "en",
    analysis: analysisFixture,
    privacyDecision: buildLlmPrivacyDecision({ projectVisibility: "public", repositoryPrivate: false }),
    provider,
    budget: unlimited,
    units: [unit],
    ...overrides,
  });

  it("maps, verifies, checks and reduces into a review with evidence", async () => {
    const { provider, requests } = scriptedProvider([mapAnswer, checkAnswer, reduceAnswer]);
    const result = await runTwoStageAnalysis(baseInput(provider));

    expect(requests.map((r) => r.reasoningEffort)).toEqual(["low", "low", "low"]);
    expect(result.claims.map((c) => c.id)).toEqual(["c1"]);
    expect(result.rejectedClaims).toEqual({ symbol_not_found: 1 });
    expect(result.claimCheck).toEqual({ checked: 2, refuted: 1, uncheckedRisks: 0 });
    expect(result.overview.strengths).toHaveLength(1);
    expect(result.usage).toEqual({ inputTokens: 300, outputTokens: 150 });
    expect(result.calls.map((c) => c.label)).toEqual(["map:u1", "check", "reduce"]);
  });

  it("keeps going when one map unit answers garbage twice", async () => {
    const { provider } = scriptedProvider(["nope", "still nope", reduceAnswer]);
    const result = await runTwoStageAnalysis(baseInput(provider));

    expect(result.mapFailures).toEqual(["u1"]);
    expect(result.claims).toEqual([]);
  });

  it("does not read code for private projects (reduce on facts only)", async () => {
    const { provider, requests } = scriptedProvider([
      JSON.stringify({
        summary: { title: "Jobs", paragraphs: ["A private job runner described from measured facts only."] },
        strengths: [{ name: "CI", explanation: "CI runs the tests.", refs: ["f7"] }],
        suggestions: [],
        scores: {},
      }),
    ]);
    const result = await runTwoStageAnalysis(
      baseInput(provider, {
        privacyDecision: buildLlmPrivacyDecision({ projectVisibility: "private", repositoryPrivate: true }),
      })
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].messages[1].content).toContain("The source code was not shared");
    expect(requests[0].messages[1].content).not.toContain("retryWithBackoff");
    expect(result.units).toEqual([]);
  });

  it("propagates rate limits so the worker can reschedule", async () => {
    const limit = new LlmRateLimitError("daily", null);
    const { provider } = scriptedProvider([limit]);
    await expect(runTwoStageAnalysis(baseInput(provider))).rejects.toBe(limit);
  });
});
