/**
 * Persistence of two-stage analysis runs (AnalysisRun, AnalysisClaim,
 * ProjectScore). Every run is kept, so versions, models and costs can be
 * compared over time; the latest run backs the project page.
 */
import { Prisma, prisma } from "@repo/database";

import type { LlmUsage } from "./llm/provider.js";
import type { TwoStageResult } from "./llm/two-stage/run.js";
import { ANALYSIS_PIPELINE_VERSION } from "./llm/two-stage/run.js";

/**
 * Cost from LLM_PRICE_INPUT_PER_MTOK / LLM_PRICE_OUTPUT_PER_MTOK (USD per
 * million tokens); null when prices are not configured (e.g. a free tier).
 */
export function estimateCostUsd(usage: LlmUsage, env: NodeJS.ProcessEnv = process.env) {
  const input = Number.parseFloat(env.LLM_PRICE_INPUT_PER_MTOK ?? "");
  const output = Number.parseFloat(env.LLM_PRICE_OUTPUT_PER_MTOK ?? "");
  if (!Number.isFinite(input) || !Number.isFinite(output)) return null;
  return (usage.inputTokens * input + usage.outputTokens * output) / 1_000_000;
}

const AXIS = {
  architecture: "ARCHITECTURE",
  security: "SECURITY",
  testing: "TESTING",
  devops: "DEVOPS",
  documentation: "DOCUMENTATION",
} as const;

export async function saveAnalysisRun(input: {
  projectId: number;
  result: TwoStageResult;
  privacyMode: string;
  durationMs: number;
}) {
  const { result, projectId } = input;
  const costUsd = estimateCostUsd(result.usage);

  return prisma.$transaction(async (tx) => {
    const run = await tx.analysisRun.create({
      data: {
        projectId,
        pipelineVersion: ANALYSIS_PIPELINE_VERSION,
        provider: result.provider.name,
        model: result.provider.model,
        commitSha: result.commitSha,
        privacyMode: input.privacyMode,
        status: "DONE",
        llmCalls: result.calls.length,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costUsd: costUsd === null ? null : new Prisma.Decimal(costUsd.toFixed(6)),
        durationMs: input.durationMs,
        stats: {
          units: result.units,
          mapFailures: result.mapFailures,
          rejectedClaims: result.rejectedClaims,
          invalidClaims: result.invalidClaims,
          claimCheck: result.claimCheck,
          calls: result.calls,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    if (result.claims.length > 0) {
      await tx.analysisClaim.createMany({
        data: result.claims.map((claim) => ({
          runId: run.id,
          projectId,
          key: claim.id,
          module: claim.module,
          kind: claim.kind.toUpperCase() as "RESPONSIBILITY" | "PATTERN" | "NOTABLE" | "RISK",
          text: claim.text,
          filePath: claim.file,
          startLine: claim.startLine,
          endLine: claim.endLine,
          symbol: claim.symbol,
          location: claim.status,
          checked: claim.checked ?? false,
        })),
      });
    }

    if (result.scores.length > 0) {
      await tx.projectScore.createMany({
        data: result.scores.map((score) => ({
          runId: run.id,
          projectId,
          axis: AXIS[score.axis],
          score: score.score,
          source: score.source,
          rationale: score.rationale,
          evidence: score.evidence as unknown as Prisma.InputJsonValue,
        })),
      });
    }

    return run;
  });
}
