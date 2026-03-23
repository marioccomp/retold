import { ProjectClassification } from "../analyze/classify-project.js";
import { Heuristic } from "../types/heuristic.js";
import { groq } from "./groq-client.js";
import { projectOverviewPrompt } from "./prompts/project-overview.js";
import { projectPrompt } from "./prompts/project-prompt.js";

export async function analyzeProjectWithLLM(analysis: Heuristic, repoName: string, title?: string, description?: string) {
  // === DETAILED LOGGING: What data arrives at the LLM ===
  console.log("\n========== [LLM INPUT DEBUG] ==========");
  console.log("[LLM INPUT] Stack:", JSON.stringify(analysis.stack, null, 2));
  console.log("[LLM INPUT] Infra:", JSON.stringify(analysis.infra, null, 2));
  console.log("[LLM INPUT] Stats:", JSON.stringify(analysis.stats, null, 2));
  console.log("[LLM INPUT] Structure:", JSON.stringify(analysis.structure, null, 2));
  console.log("[LLM INPUT] Classification:", JSON.stringify(analysis.classification, null, 2));
  console.log("[LLM INPUT] README length:", analysis.readme?.length ?? 0, "chars");
  console.log("[LLM INPUT] README preview:", analysis.readme?.slice(0, 300) ?? "<missing>");
  console.log("[LLM INPUT] Code samples count:", analysis.codeSamples?.length ?? 0);
  console.log("========================================\n");


  console.log("repo name: ", repoName);

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

  console.log("Aqui esta o retorno da llm: ", completion1);

  const raw1 = completion1.choices[0].message.content ?? "";

  console.log("[LLM] Raw response (first attempt):", raw1.slice(0, 2000));

  const parsed1 = tryParseJson(raw1);
  if (parsed1.ok) return parsed1.value;

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



