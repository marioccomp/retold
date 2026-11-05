import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@repo/database";
import { estimateCostUsd, saveAnalysisRun } from "../../../../../services/worker/analysis-run";
import type { TwoStageResult } from "../../../../../services/worker/llm/two-stage/run";
import {
  cleanupIntegrationRun,
  createIntegrationProject,
  createIntegrationRunId,
  createIntegrationUser,
} from "@/src/test-utils/integration-db";

const runIds: string[] = [];

afterEach(async () => {
  while (runIds.length > 0) {
    await cleanupIntegrationRun(runIds.pop()!);
  }
});

function twoStageResult(): TwoStageResult {
  return {
    overview: {},
    claims: [
      {
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
        checked: true,
      },
      {
        id: "c2",
        unitId: "u1",
        module: "src",
        kind: "responsibility",
        text: "Schedules background jobs.",
        file: "src/queue.ts",
        startLine: 8,
        endLine: 12,
        symbol: "JobRunner",
        status: "reanchored",
      },
    ],
    rejectedClaims: { symbol_not_found: 2 },
    invalidClaims: 0,
    claimCheck: { checked: 1, refuted: 0, uncheckedRisks: 0 },
    scores: [
      {
        axis: "architecture",
        score: 80,
        source: "llm",
        rationale: "Clear queue layer.",
        evidence: [
          { type: "code", claimId: "c1", file: "src/queue.ts", startLine: 3, endLine: 6, url: null },
        ],
      },
      { axis: "testing", score: 83, source: "measured", rationale: "10 test files", evidence: [] },
    ],
    units: [{ id: "u1", module: "src", files: ["src/queue.ts"], tokens: 900 }],
    mapFailures: [],
    provider: { name: "groq", model: "openai/gpt-oss-120b" },
    commitSha: "a".repeat(40),
    usage: { inputTokens: 9000, outputTokens: 2500 },
    calls: [
      { label: "map:u1", inputTokens: 4000, outputTokens: 900, durationMs: 5000, waitedMs: 0 },
      { label: "check", inputTokens: 2000, outputTokens: 300, durationMs: 2000, waitedMs: 40_000 },
      { label: "reduce", inputTokens: 3000, outputTokens: 1300, durationMs: 6000, waitedMs: 30_000 },
    ],
  };
}

describe("saveAnalysisRun", () => {
  it("stores the run with its tokens, verified claims and axis scores", async () => {
    const runId = createIntegrationRunId("run");
    runIds.push(runId);
    const user = await createIntegrationUser(runId, { label: "owner" });
    const project = await createIntegrationProject(runId, { userId: user.id, label: "project" });

    const run = await saveAnalysisRun({
      projectId: project.id,
      result: twoStageResult(),
      privacyMode: "metadata+sanitized-readme+sanitized-samples",
      durationMs: 95_000,
    });

    const stored = await prisma.analysisRun.findUniqueOrThrow({
      where: { id: run.id },
      include: { claims: { orderBy: { key: "asc" } }, scores: { orderBy: { axis: "asc" } } },
    });

    expect(stored).toMatchObject({
      status: "DONE",
      model: "openai/gpt-oss-120b",
      commitSha: "a".repeat(40),
      llmCalls: 3,
      inputTokens: 9000,
      outputTokens: 2500,
      durationMs: 95_000,
    });
    expect(stored.claims.map((c) => [c.key, c.kind, c.location, c.checked])).toEqual([
      ["c1", "NOTABLE", "verified", true],
      ["c2", "RESPONSIBILITY", "reanchored", false],
    ]);
    expect(stored.scores.map((s) => [s.axis, s.score, s.source])).toEqual([
      ["ARCHITECTURE", 80, "llm"],
      ["TESTING", 83, "measured"],
    ]);

    // Deleting the project removes its history.
    await prisma.project.delete({ where: { id: project.id } });
    expect(await prisma.analysisRun.count({ where: { id: run.id } })).toBe(0);
    expect(await prisma.analysisClaim.count({ where: { runId: run.id } })).toBe(0);
  });
});

describe("estimateCostUsd", () => {
  it("is null without configured prices and computed per million tokens otherwise", () => {
    const usage = { inputTokens: 1_000_000, outputTokens: 500_000 };
    expect(estimateCostUsd(usage, {} as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(
      estimateCostUsd(usage, {
        LLM_PRICE_INPUT_PER_MTOK: "0.15",
        LLM_PRICE_OUTPUT_PER_MTOK: "0.6",
      } as unknown as NodeJS.ProcessEnv)
    ).toBeCloseTo(0.45);
  });
});
