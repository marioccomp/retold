/**
 * Two-stage analysis (phase 2 of docs/analysis-roadmap.md):
 *   map    — per unit of central files, claims citing file + lines + symbol;
 *   verify — deterministic checks drop or reanchor claims (validate.ts);
 *   reduce — the project review, built only on measured facts and verified claims,
 *            whose references are checked again before anything is kept.
 */
import { createLogger } from "@repo/observability";

import type { LlmPrivacyDecision } from "../../privacy.js";
import { completeJson, LlmAnalysisUnavailableError } from "../analyze-project.js";
import { BudgetedProvider, estimateRequestTokens, LlmBudget, LlmCallRecord } from "../budget.js";
import type { LlmProvider, LlmUsage } from "../provider.js";
import {
  AnalysisForFacts,
  AxisScore,
  buildMeasuredFacts,
  hygieneSuggestion,
  MeasuredFact,
  measuredScores,
} from "./facts.js";
import { applyCheckVerdicts, planClaimCheck } from "./check.js";
import { buildMapMessages, buildReduceMessages } from "./prompts.js";
import { parseCheckOutput, parseMapOutput, parseReduceOutput, ReduceItem, ReduceOutput } from "./schemas.js";
import { AnalysisUnit, buildAnalysisUnits } from "./units.js";
import { RejectionReason, validateClaims, VerifiedClaim } from "./validate.js";

const logger = createLogger("worker.two-stage-analysis");

/** Bump when prompts, budgets or validation change in a way that changes results. */
export const ANALYSIS_PIPELINE_VERSION = "2.0.0";

/** Room left for chat framing and estimation error in each call. */
const SAFETY_MARGIN_TOKENS = 250;
const README_MAX_CHARS = 1500;
const MAX_ITEMS = 4;

export type Evidence =
  | { type: "code"; claimId: string; file: string; startLine: number; endLine: number; url: string | null }
  | { type: "fact"; factId: string; text: string };

export type ScoreWithEvidence = AxisScore & { evidence: Evidence[] };

export type TwoStageInput = {
  repoPath: string;
  repoName: string;
  /** Web URL of the repository (GitHub), used for permalinks. */
  repoUrl?: string;
  commitSha: string | null;
  title?: string;
  description?: string;
  locale?: string;
  analysis: AnalysisForFacts;
  /** Already sanitized according to the privacy decision (or undefined). */
  readme?: string;
  privacyDecision: LlmPrivacyDecision;
  provider: LlmProvider;
  budget: LlmBudget;
  /** Injected in tests. */
  units?: AnalysisUnit[];
};

export type TwoStageResult = {
  overview: Record<string, unknown>;
  claims: VerifiedClaim[];
  rejectedClaims: Partial<Record<RejectionReason, number>>;
  invalidClaims: number;
  /** Second-look check: claims sent, refuted, and risks dropped unchecked. */
  claimCheck: { checked: number; refuted: number; uncheckedRisks: number };
  scores: ScoreWithEvidence[];
  units: { id: string; module: string; files: string[]; tokens: number }[];
  mapFailures: string[];
  provider: { name: string; model: string };
  commitSha: string | null;
  usage: LlmUsage;
  calls: LlmCallRecord[];
};

export function githubWebUrl(repoUrl: string | undefined) {
  const match = repoUrl?.match(/github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i);
  return match ? `https://github.com/${match[1]}/${match[2]}` : null;
}

export function evidenceUrl(webUrl: string | null, sha: string | null, claim: VerifiedClaim) {
  if (!webUrl || !sha) return null;
  const file = claim.file.split("/").map(encodeURIComponent).join("/");
  const lines = claim.startLine === claim.endLine ? `L${claim.startLine}` : `L${claim.startLine}-L${claim.endLine}`;
  return `${webUrl}/blob/${sha}/${file}#${lines}`;
}

function languageCode(locale: string | undefined) {
  const lower = (locale ?? "en").toLowerCase();
  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("es")) return "es";
  return "en";
}

/** Claims ordered round-robin across units, so trimming keeps every part represented. */
function interleaveByUnit(claims: VerifiedClaim[]) {
  const byUnit = new Map<string, VerifiedClaim[]>();
  for (const claim of claims) byUnit.set(claim.unitId, [...(byUnit.get(claim.unitId) ?? []), claim]);
  const queues = [...byUnit.values()];
  const ordered: VerifiedClaim[] = [];
  while (queues.some((q) => q.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next) ordered.push(next);
    }
  }
  return ordered;
}

export async function runTwoStageAnalysis(input: TwoStageInput): Promise<TwoStageResult> {
  const { budget, analysis, privacyDecision } = input;
  const provider = new BudgetedProvider(input.provider, { tokensPerMinute: budget.tokensPerMinute });
  const facts = buildMeasuredFacts(analysis);
  const codeShared = privacyDecision.includeCodeSamples;
  const stackLine =
    [analysis.summary.primaryLanguage, ...analysis.stack.frameworks.slice(0, 3)].filter(Boolean).join(", ") ||
    analysis.summary.appType;

  // A call must fit both the per-call input budget and, with its output, the per-minute limit.
  const inputCap = (maxOutput: number) =>
    Math.min(
      budget.maxInputTokensPerCall,
      budget.tokensPerMinute === null ? Infinity : budget.tokensPerMinute - maxOutput - SAFETY_MARGIN_TOKENS
    );

  // ---- map ----
  let units: AnalysisUnit[] = [];
  if (codeShared && budget.maxMapCalls > 0) {
    const emptyUnit: AnalysisUnit = { id: "u0", module: ".", files: [], tokens: 0 };
    const overhead =
      estimateRequestTokens({
        messages: buildMapMessages({ repoName: input.repoName, unit: emptyUnit, stackLine, locale: input.locale }),
      }) + SAFETY_MARGIN_TOKENS;
    const contentTokensPerUnit = inputCap(budget.maxOutputTokensMap) - overhead;

    units =
      input.units ??
      (contentTokensPerUnit > 300
        ? buildAnalysisUnits(input.repoPath, analysis.repoMap, {
            maxUnits: budget.maxMapCalls,
            contentTokensPerUnit,
          })
        : []);
  }

  let claimCounter = 0;
  const nextId = () => `c${++claimCounter}`;
  const claims: VerifiedClaim[] = [];
  const rejectedClaims: Partial<Record<RejectionReason, number>> = {};
  const unitSummaries: { module: string; summary: string }[] = [];
  const mapFailures: string[] = [];
  let invalidClaims = 0;

  for (const unit of units) {
    try {
      const output = await completeJson(
        provider,
        {
          messages: buildMapMessages({ repoName: input.repoName, unit, stackLine, locale: input.locale }),
          temperature: 0.1,
          maxOutputTokens: budget.maxOutputTokensMap,
          reasoningEffort: "low",
        },
        parseMapOutput,
        { label: `map:${unit.id}`, repoName: input.repoName }
      );

      invalidClaims += output.invalid;
      const { verified, rejected } = validateClaims(output.claims, unit, nextId);
      claims.push(...verified);
      for (const r of rejected) rejectedClaims[r.reason] = (rejectedClaims[r.reason] ?? 0) + 1;
      if (output.summary) unitSummaries.push({ module: unit.module, summary: output.summary });

      logger.info("analysis.map_unit_done", {
        repoName: input.repoName,
        unit: unit.id,
        module: unit.module,
        files: unit.files.length,
        claims: output.claims.length,
        verified: verified.length,
        rejected: rejected.length,
      });
    } catch (error) {
      // One unreadable unit should not sink the analysis; rate limits must propagate.
      if (!(error instanceof LlmAnalysisUnavailableError)) throw error;
      mapFailures.push(unit.id);
      logger.warn("analysis.map_unit_failed", { repoName: input.repoName, unit: unit.id }, error);
    }
  }

  // ---- check (is each claim true, not only well placed?) ----
  let refutedClaims = 0;
  let uncheckedRisks = 0;
  let checkedClaims = 0;
  if (claims.length > 0 && budget.maxOutputTokensCheck > 0) {
    const filesByPath = new Map(units.flatMap((u) => u.files.map((f) => [f.path, f] as const)));
    const plan = planClaimCheck(claims, filesByPath, inputCap(budget.maxOutputTokensCheck));
    if (plan.messages) {
      try {
        const verdicts = await completeJson(
          provider,
          {
            messages: plan.messages,
            temperature: 0,
            maxOutputTokens: budget.maxOutputTokensCheck,
            reasoningEffort: "low",
          },
          parseCheckOutput,
          { label: "check", repoName: input.repoName }
        );
        const applied = applyCheckVerdicts(claims, plan.ids, verdicts);
        refutedClaims = applied.refuted;
        uncheckedRisks = applied.uncheckedRisks;
        checkedClaims = plan.ids.length;
        claims.splice(0, claims.length, ...applied.kept);
      } catch (error) {
        if (!(error instanceof LlmAnalysisUnavailableError)) throw error;
        // Without a check, keep the located claims but not the criticisms.
        const applied = applyCheckVerdicts(claims, [], new Map());
        uncheckedRisks = applied.uncheckedRisks;
        claims.splice(0, claims.length, ...applied.kept);
        logger.warn("analysis.claim_check_failed", { repoName: input.repoName }, error);
      }
    }
  }

  // ---- reduce ----
  const readme = input.readme ? input.readme.slice(0, README_MAX_CHARS) : undefined;
  const reduceCap = inputCap(budget.maxOutputTokensReduce);
  const buildReduce = (selected: VerifiedClaim[], withReadme: boolean) =>
    buildReduceMessages({
      repoName: input.repoName,
      title: input.title,
      description: input.description,
      purpose: analysis.classification.purpose,
      facts,
      unitSummaries,
      claims: selected,
      readme: withReadme ? readme : undefined,
      locale: input.locale,
      codeShared,
    });

  let selected = interleaveByUnit(claims);
  let withReadme = Boolean(readme);
  let messages = buildReduce(selected, withReadme);
  while (estimateRequestTokens({ messages }) > reduceCap) {
    if (selected.length > 0) selected = selected.slice(0, -1);
    else if (withReadme) withReadme = false;
    else break;
    messages = buildReduce(selected, withReadme);
  }

  const reduce = await completeJson(
    provider,
    {
      messages,
      temperature: 0.2,
      maxOutputTokens: budget.maxOutputTokensReduce,
      reasoningEffort: "low",
    },
    parseReduceOutput,
    { label: "reduce", repoName: input.repoName }
  );

  const result = assembleOverview({
    reduce,
    claims: selected,
    facts,
    analysis,
    webUrl: githubWebUrl(input.repoUrl),
    commitSha: input.commitSha,
    locale: input.locale,
    privacyMode: privacyDecision.mode,
  });

  return {
    overview: {
      ...result.overview,
      analysis: {
        pipelineVersion: ANALYSIS_PIPELINE_VERSION,
        commitSha: input.commitSha,
        unitsAnalyzed: units.length - mapFailures.length,
        claimsVerified: claims.length,
      },
    },
    claims,
    rejectedClaims,
    invalidClaims,
    claimCheck: { checked: checkedClaims, refuted: refutedClaims, uncheckedRisks },
    scores: result.scores,
    units: units.map((u) => ({ id: u.id, module: u.module, files: u.files.map((f) => f.path), tokens: u.tokens })),
    mapFailures,
    provider: { name: provider.name, model: provider.model },
    commitSha: input.commitSha,
    usage: provider.usage,
    calls: provider.calls,
  };
}

/** Removes reference ids the model copied into prose: "routes (c10)", "(f7, f8)". */
export function stripRefIds(text: string) {
  return text
    .replace(/\s*\((?:\s*[cf]\d+\s*[,;]?)+\)/gi, "")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

/** Keeps only reduce items backed by known ids, and turns refs into evidence. */
export function assembleOverview(input: {
  reduce: ReduceOutput;
  claims: VerifiedClaim[];
  facts: MeasuredFact[];
  analysis: AnalysisForFacts;
  webUrl: string | null;
  commitSha: string | null;
  locale?: string;
  privacyMode: string;
}) {
  const claimsById = new Map(input.claims.map((c) => [c.id, c]));
  const factsById = new Map(input.facts.map((f) => [f.id, f]));

  const toEvidence = (refs: string[]): Evidence[] => {
    const seen = new Set<string>();
    const evidence: Evidence[] = [];
    for (const raw of refs) {
      const ref = raw.trim().toLowerCase();
      if (seen.has(ref)) continue;
      seen.add(ref);
      const claim = claimsById.get(ref);
      if (claim) {
        evidence.push({
          type: "code",
          claimId: claim.id,
          file: claim.file,
          startLine: claim.startLine,
          endLine: claim.endLine,
          url: evidenceUrl(input.webUrl, input.commitSha, claim),
        });
        continue;
      }
      const fact = factsById.get(ref);
      if (fact) evidence.push({ type: "fact", factId: fact.id, text: fact.text });
    }
    return evidence;
  };

  const supported = (items: ReduceItem[]) =>
    items
      .map((item) => ({
        name: stripRefIds(item.name),
        explanation: stripRefIds(item.explanation),
        evidence: toEvidence(item.refs),
      }))
      .filter((item) => item.evidence.length > 0)
      .slice(0, MAX_ITEMS);

  const suggestions = supported(input.reduce.suggestions);
  const hygieneFact = input.facts.find((f) => f.topic === "hygiene");
  if (hygieneFact) {
    const raised = suggestions.some((s) =>
      s.evidence.some((e) => e.type === "fact" && e.factId === hygieneFact.id)
    );
    const fixed = hygieneSuggestion(input.analysis.repoMap, input.locale, hygieneFact.id);
    if (!raised && fixed) {
      suggestions.unshift({
        name: fixed.name,
        explanation: fixed.explanation,
        evidence: toEvidence([hygieneFact.id]),
      });
      suggestions.splice(MAX_ITEMS);
    }
  }

  const llmScores: ScoreWithEvidence[] = [];
  for (const axis of ["architecture", "security"] as const) {
    const score = input.reduce.scores[axis];
    if (!score) continue;
    const evidence = toEvidence(score.refs);
    // A judgement about the code needs at least one verified code claim.
    if (!evidence.some((e) => e.type === "code")) continue;
    llmScores.push({ axis, score: score.score * 20, source: "llm", rationale: score.rationale, evidence });
  }

  const scores: ScoreWithEvidence[] = [
    ...llmScores,
    ...measuredScores(input.analysis.repoMap).map((s) => ({ ...s, evidence: [] as Evidence[] })),
  ];

  const { summary, classification } = input.analysis;
  const overview = {
    schema_version: "3.0",
    language: languageCode(input.locale),
    meta: {
      primaryLanguage: summary.primaryLanguage,
      appType: summary.appType,
      domain: classification.domain,
      purpose: classification.purpose,
    },
    summary: {
      title: stripRefIds(input.reduce.summary.title),
      paragraphs: input.reduce.summary.paragraphs.map(stripRefIds),
    },
    architecture: {
      explanation: stripRefIds(input.reduce.architecture.explanation),
      evidence: toEvidence(input.reduce.architecture.refs),
    },
    strengths: supported(input.reduce.strengths),
    suggestions,
    scores,
    privacy_mode: input.privacyMode,
  };

  return { overview, scores };
}
