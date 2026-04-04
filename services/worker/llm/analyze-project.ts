import { ProjectClassification } from "../analyze/classify-project.js";
import { Heuristic } from "../types/heuristic.js";
import { createLogger } from "@repo/observability";
import { groq } from "./groq-client.js";
import { projectOverviewPrompt } from "./prompts/project-overview.js";
import { projectPrompt } from "./prompts/project-prompt.js";

const logger = createLogger("worker.llm-analysis");

export async function analyzeProjectWithLLM(analysis: Heuristic, repoName: string, title?: string, description?: string) {
  logger.debug("llm.request_prepared", {
    repoName,
    readmeLength: analysis.readme?.length ?? 0,
    codeSamplesCount: analysis.codeSamples?.length ?? 0,
    frameworkCount: analysis.stack.frameworks.length,
    languageCount: analysis.stack.languages.length,
    totalFiles: analysis.stats.totalFiles,
  });

  const prompt = projectOverviewPrompt(analysis, analysis.locale);
  const prompt2 = projectPrompt(analysis, repoName, title, description);

  const system =
    "You are an elite Senior Software Architecture Consultant. " +
    "You MUST follow instructions exactly. ";

  const completion1 = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt2 },
    ],
    response_format: {
      type: "json_object"
    },
    temperature: 0.05,
  });

  const raw1 = completion1.choices[0].message.content ?? "";
  logger.debug("llm.first_response_received", {
    repoName,
    rawLength: raw1.length,
  });

  const parsed1 = tryParseJson(raw1);
  if (parsed1.ok) return parsed1.value;
  logger.warn("llm.first_response_invalid_json", {
    repoName,
    rawLength: raw1.length,
  });

  // Retry (mais agressivo)
  const completion2 = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content:
          prompt2 +
          "\n\nCRITICAL: Your previous answer was NOT valid JSON. " +
          "Return ONLY valid JSON matching the schema. " +
          "No markdown, no comments, no trailing text.",
      },
    ],
    temperature: 0.0,
  });

  const raw2 = completion2.choices[0].message.content ?? "";
  const parsed2 = tryParseJson(raw2);
  if (parsed2.ok) return parsed2.value;

  logger.error("llm.second_response_invalid_json", undefined, {
    repoName,
    rawLength: raw2.length,
  });

  // fallback: devolve o bruto (ou lança erro)
  return {
    schema_version: "1.0",
    language: normalizeLocale(analysis.locale),
    error: "invalid_json_from_llm",
    raw: raw2.slice(0, 20_000),
  };
}

function tryParseJson(s: string): { ok: true; value: any } | { ok: false; error: string } {
  try {
    // tenta extrair bloco JSON caso venha com lixo antes/depois
    const trimmed = s.trim();

    // se vier com texto extra, tenta pegar do primeiro { até o último }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return { ok: false, error: "no_json_object_found" };
    }

    const candidate = trimmed.slice(start, end + 1);
    const obj = JSON.parse(candidate);
    return { ok: true, value: obj };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "json_parse_error" };
  }
}

function normalizeLocale(locale?: string): "pt-BR" | "en" | "es" {
  if (!locale) return "en";
  const l = locale.toLowerCase();
  if (l.startsWith("pt")) return "pt-BR";
  if (l.startsWith("es")) return "es";
  return "en";
}


