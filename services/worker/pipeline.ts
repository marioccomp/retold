/**
 * The project analysis pipeline, independent of BullMQ and of the database:
 * README → repository heuristics → privacy preparation → LLM → tags.
 *
 * The worker job (index.ts) and the eval runner (evals/run-eval.ts) both call
 * this, so the eval measures exactly what production runs.
 */
import { createLogger } from "@repo/observability";

import { analyzeRepository } from "./analyze/index.js";
import { analyzeProjectWithLLM } from "./llm/analyze-project.js";
import { getDefaultLlmProvider, LlmProvider } from "./llm/index.js";
import { LlmPrivacyDecision, prepareAnalysisForLlm } from "./privacy.js";
import { tryReadRepositoryTextFile } from "./security.js";

const logger = createLogger("worker.project-analysis");

export function readRepositoryReadme(repoPath: string, maxChars = 30_000) {
  const possibleReadmePaths = ["README.md", "readme.md", "README.MD"];
  for (const fileName of possibleReadmePaths) {
    try {
      const content = tryReadRepositoryTextFile(repoPath, fileName, maxChars);
      if (content !== null) {
        return content;
      }
    } catch (error) {
      logger.warn("worker.repository_readme_blocked", { readmeName: fileName }, error);
    }
  }
  return "";
}

export type AnalysisPipelineInput = {
  repoPath: string;
  repoUrl: string;
  repoName: string;
  title?: string;
  description?: string;
  locale: string;
  privacyDecision: LlmPrivacyDecision;
  provider?: LlmProvider;
  /** Extra fields for log lines (e.g. projectId). */
  logContext?: Record<string, unknown>;
};

export async function runAnalysisPipeline(input: AnalysisPipelineInput) {
  const { repoPath, privacyDecision, logContext = {} } = input;
  const readme = readRepositoryReadme(repoPath);

  logger.info("worker.repository_analysis_started", logContext);
  const analysis = await analyzeRepository(repoPath, {
    readme,
    repoUrl: input.repoUrl,
    includeCodeSamples: privacyDecision.includeCodeSamples,
  });
  logger.info("worker.repository_analysis_completed", {
    ...logContext,
    totalFiles: analysis.stats.totalFiles,
    frameworkCount: analysis.stack.frameworks.length,
    languageCount: analysis.stack.languages.length,
    codeSamplesCount: analysis.codeSamples?.length ?? 0,
  });

  const preparedLlmAnalysis = prepareAnalysisForLlm(
    {
      ...analysis,
      readme,
      codeSamples: analysis.codeSamples,
      locale: input.locale,
    },
    privacyDecision
  );

  logger.info("worker.llm_privacy_mode_selected", {
    ...logContext,
    mode: privacyDecision.mode,
    projectSensitivity: privacyDecision.projectSensitivity,
    externalLlmAllowed: privacyDecision.externalLlmAllowed,
    includeReadme: privacyDecision.includeReadme,
    includeCodeSamples: privacyDecision.includeCodeSamples,
    redactionsApplied: preparedLlmAnalysis.redactionsApplied,
  });

  const llmInsights = await analyzeProjectWithLLM(
    preparedLlmAnalysis.promptAnalysis,
    input.repoName,
    input.title,
    input.description,
    privacyDecision,
    input.provider ?? getDefaultLlmProvider()
  );

  const insights = llmInsights as {
    summary?: { paragraphs?: unknown[] };
    suggestions?: unknown[];
    error?: unknown;
  };
  logger.info("worker.llm_analysis_completed", {
    ...logContext,
    hasError: Boolean(insights.error),
    summaryParagraphs: Array.isArray(insights.summary?.paragraphs)
      ? insights.summary.paragraphs.length
      : 0,
    suggestionCount: Array.isArray(insights.suggestions) ? insights.suggestions.length : 0,
  });

  return {
    readme,
    analysis,
    preparedLlmAnalysis,
    llmInsights,
    tags: selectProjectTags(analysis),
  };
}

export type RepositoryAnalysisResult = Awaited<ReturnType<typeof analyzeRepository>>;

const FRAMEWORK_TAG_PRIORITY: Record<string, number> = {
  // backend / main frameworks
  NestJS: 0,
  Express: 0,
  FastAPI: 0,
  Django: 0,
  Flask: 0,
  AdonisJS: 0,
  "Next.js": 0,
  "Nuxt.js": 0,
  Rails: 0,
  // frontend / mobile frameworks
  "React Native": 1,
  React: 1,
  Vue: 1,
  Angular: 1,
  Svelte: 1,
  Flutter: 1,
  "Spring Boot": 1,
  Laravel: 1,
  // SDKs/runners that matter less as tags
  Expo: 2,
  Electron: 2,
};

/** Up to 4 tags: the primary language, then frameworks by priority. */
export function selectProjectTags(
  analysis: Pick<RepositoryAnalysisResult, "summary" | "stack">,
  maxTags = 4
) {
  const tags: string[] = [];
  const primaryLanguage = analysis.summary.primaryLanguage;

  // The fallback value is "Unknown" (capitalized); compare case-insensitively.
  if (primaryLanguage && primaryLanguage.toLowerCase() !== "unknown") {
    tags.push(primaryLanguage);
  }

  const frameworks = Array.isArray(analysis.stack.frameworks) ? analysis.stack.frameworks : [];
  const sortedFrameworks = [...frameworks].sort(
    (a, b) => (FRAMEWORK_TAG_PRIORITY[a] ?? 1) - (FRAMEWORK_TAG_PRIORITY[b] ?? 1)
  );

  for (const framework of sortedFrameworks) {
    if (tags.length >= maxTags) break;
    if (!tags.includes(framework)) tags.push(framework);
  }

  return tags;
}
