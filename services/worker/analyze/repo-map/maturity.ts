/**
 * Measured engineering maturity: what the repository demonstrably has, as
 * opposed to what its README claims or what its purpose suggests.
 *
 * Each signal contributes points (total 100) and a short evidence string, so
 * the score is explainable and the LLM (phase 2) can cite it.
 */
import type { HygieneReport } from "./hygiene.js";

export type MaturityLevel = "low" | "medium" | "high";

export type MaturitySignals = {
  sourceFiles: number;
  testFiles: number;
  ciProviders: string[];
  /** Contents of CI configuration files. */
  ciConfigs: string[];
  lintTools: string[];
  /** Statically typed primary language, or TS strict / Python type checker configured. */
  typeChecked: boolean;
  containerized: boolean;
  readme: string;
  commitsAnalyzed: number;
  contributors: number;
  hygiene: HygieneReport;
};

export type MaturityReport = {
  score: number;
  level: MaturityLevel;
  breakdown: { signal: string; points: number; max: number; evidence: string }[];
};

const TEST_COMMAND =
  /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test(?::[\w:-]+)?\b|\b(?:vitest|jest|mocha|ava|playwright\s+test|cypress\s+run)\b|\bpytest\b|\btox\b|\bnox\b|python\s+-m\s+(?:pytest|unittest)|\bgo\s+test\b|(?:\bcargo|\bcross|\$\{\{\s*env\.CARGO\s*\}\})\s+(?:test|nextest)\b|\bmvnw?\b[^\n]*\b(?:test|verify|install)\b|\bgradlew?\b[^\n]*\b(?:test|check|build)\b|\bmake\s+(?:test|check)\b|\bctest\b|\bdotnet\s+test\b|\brspec\b|\bbundle\s+exec\s+rake\b|\bphpunit\b/i;

const EXTRA_TEST_COMMAND = /\bmake\s+(?:ci|test\w*)\b|manage\.py\s+test\b/i;
/** A CI step or job explicitly named after tests ("- name: Run tests", "tests:"). */
const TEST_STEP_NAME = /^\s*-?\s*name:\s*[^\n]*\btests?\b|^\s{2,4}tests?:\s*$/im;

export function ciRunsTests(ciConfigs: string[]) {
  return ciConfigs.some(
    (config) => TEST_COMMAND.test(config) || EXTRA_TEST_COMMAND.test(config) || TEST_STEP_NAME.test(config)
  );
}

const SETUP_SECTION = /\b(install|installation|getting started|setup|usage|quick ?start|como rodar|como executar|instala[cç][aã]o|uso)\b/i;

export function scoreMaturity(signals: MaturitySignals): MaturityReport {
  const breakdown: MaturityReport["breakdown"] = [];
  const add = (signal: string, points: number, max: number, evidence: string) =>
    breakdown.push({ signal, points: Math.round(points), max, evidence });

  // Tests (25): presence and proportion to source files.
  const testRatio = signals.sourceFiles > 0 ? signals.testFiles / signals.sourceFiles : 0;
  add(
    "tests",
    signals.testFiles === 0 ? 0 : 8 + Math.min(17, testRatio * 85),
    25,
    signals.testFiles === 0
      ? "no test files"
      : `${signals.testFiles} test files for ${signals.sourceFiles} source files (${Math.round(testRatio * 100)}%)`
  );

  // CI (20): configured, and more importantly running the tests.
  const runsTests = ciRunsTests(signals.ciConfigs);
  add(
    "ci",
    signals.ciProviders.length === 0 ? 0 : runsTests ? 20 : 8,
    20,
    signals.ciProviders.length === 0
      ? "no CI configuration"
      : `${signals.ciProviders.join(", ")}${runsTests ? " running tests" : " without a test step"}`
  );

  add("lint", signals.lintTools.length > 0 ? 10 : 0, 10, signals.lintTools.join(", ") || "no linter config");
  add("types", signals.typeChecked ? 10 : 0, 10, signals.typeChecked ? "type-checked" : "no static type checking");
  add("container", signals.containerized ? 5 : 0, 5, signals.containerized ? "Dockerfile/compose" : "not containerized");

  // Docs (10): README with real content and setup instructions.
  const readmeLength = signals.readme.trim().length;
  const docsPoints = readmeLength === 0 ? 0 : (readmeLength > 800 ? 5 : 2) + (SETUP_SECTION.test(signals.readme) ? 5 : 0);
  add("docs", docsPoints, 10, readmeLength === 0 ? "no README" : `README with ${readmeLength} chars`);

  // History (10): sustained work and collaboration (recent history only).
  const historyPoints = Math.min(6, signals.commitsAnalyzed / 5) + (signals.contributors > 1 ? 4 : 0);
  add(
    "history",
    historyPoints,
    10,
    `${signals.commitsAnalyzed} recent commits, ${signals.contributors} contributor(s)`
  );

  // Hygiene (10): nothing committed that shouldn't be.
  const hygienePenalty = Math.min(10, signals.hygiene.flags.length * 5);
  add(
    "hygiene",
    10 - hygienePenalty,
    10,
    signals.hygiene.flags.length === 0 ? "clean" : `committed: ${signals.hygiene.flags.join(", ")}`
  );

  const score = Math.max(0, Math.min(100, breakdown.reduce((sum, b) => sum + b.points, 0)));
  const level: MaturityLevel = score >= 65 ? "high" : score >= 35 ? "medium" : "low";
  return { score, level, breakdown };
}
