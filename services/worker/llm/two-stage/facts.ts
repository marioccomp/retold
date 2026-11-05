/**
 * Measured facts (no LLM): what the reduce step may cite as "f1", "f2"… next to
 * verified code claims, plus the axis scores that do not need a model.
 */
import type { RepoMap } from "../../analyze/repo-map/index.js";
import type { Heuristic } from "../../types/heuristic.js";

export type MeasuredFact = { id: string; topic: string; text: string };

export type AnalysisForFacts = Pick<Heuristic, "summary" | "stack" | "infra" | "stats" | "classification"> & {
  repoMap: RepoMap;
};

const list = (items: string[], max = 6) =>
  items.length === 0 ? "none" : items.slice(0, max).join(", ") + (items.length > max ? ", …" : "");

function breakdown(repoMap: RepoMap, signal: string) {
  return repoMap.maturity.breakdown.find((b) => b.signal === signal);
}

export function buildMeasuredFacts(analysis: AnalysisForFacts): MeasuredFact[] {
  const { repoMap, stack, classification, summary, stats } = analysis;
  const facts: Omit<MeasuredFact, "id">[] = [];
  const add = (topic: string, text: string) => facts.push({ topic, text });

  add(
    "stack",
    `Languages: ${list(stack.languages)}. Frameworks: ${list(stack.frameworks)}. Tools: ${list(stack.tools)}.`
  );
  add(
    "classification",
    `Classified as a ${classification.purpose} ${classification.domain} project (app type: ${summary.appType}).`
  );
  add("size", `${stats.sourceFiles} source files, ${stats.testFiles} test files, ${stats.totalFiles} files in total.`);

  const modules = repoMap.modules
    .filter((m) => m.sourceFiles > 0)
    .slice(0, 8)
    .map((m) => {
    const deps = m.dependsOn.length > 0 ? `, uses ${m.dependsOn.slice(0, 3).join(", ")}` : "";
    return `${m.path} (${m.sourceFiles} source files, ${m.loc} lines${deps})`;
  });
  add("modules", `Modules: ${modules.join("; ") || "single module"}.`);

  if (repoMap.centralFiles.length > 0) {
    const central = repoMap.centralFiles
      .slice(0, 5)
      .map((f) => `${f.path} (imported by ${f.fanIn})`)
      .join(", ");
    add("central-files", `Most depended-on files: ${central}.`);
  }

  for (const signal of ["tests", "ci", "lint", "types", "container", "docs", "history"]) {
    const entry = breakdown(repoMap, signal);
    if (entry) add(signal, `${signal}: ${entry.evidence}.`);
  }

  if (repoMap.hygiene.flags.length > 0) {
    const committed = repoMap.hygiene.flags
      .map((flag) => `${flag} (${repoMap.hygiene.counts[flag] ?? "?"} files)`)
      .join(", ");
    add("hygiene", `Committed files that should not be versioned: ${committed}.`);
  }

  add("maturity", `Measured maturity: ${repoMap.maturity.score}/100 (${repoMap.maturity.level}).`);

  return facts.map((fact, index) => ({ id: `f${index + 1}`, ...fact }));
}

export type AxisScore = {
  axis: "architecture" | "security" | "testing" | "devops" | "documentation";
  /** 0–100. */
  score: number;
  source: "measured" | "llm";
  rationale: string;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

/** Testing, DevOps and Documentation come straight from the measured maturity. */
export function measuredScores(repoMap: RepoMap): AxisScore[] {
  const get = (signal: string) => breakdown(repoMap, signal);
  const points = (signal: string) => get(signal)?.points ?? 0;
  const evidence = (...signals: string[]) =>
    signals
      .map((s) => get(s)?.evidence)
      .filter(Boolean)
      .join("; ");

  const ciRunsTests = points("ci") >= 20;
  return [
    {
      axis: "testing",
      score: clamp((points("tests") / 25) * 85 + (ciRunsTests && points("tests") > 0 ? 15 : 0)),
      source: "measured",
      rationale: evidence("tests", "ci"),
    },
    {
      axis: "devops",
      score: clamp(points("ci") * 3 + points("container") * 4 + points("lint") * 2),
      source: "measured",
      rationale: evidence("ci", "container", "lint"),
    },
    {
      axis: "documentation",
      score: clamp(points("docs") * 10),
      source: "measured",
      rationale: evidence("docs"),
    },
  ];
}
