import { ProjectClassification } from "../analyze/classify-project.js";
import { Heuristic } from "../types/heuristic.js";
import { groq } from "./groq-client.js";
import { projectOverviewPrompt } from "./prompts/project-overview.js";

export async function analyzeProjectWithLLM(analysis: Heuristic) {
  const prompt = projectOverviewPrompt(analysis, analysis.locale);

  const system =
    "You are an elite Software Architecture Consultant. " +
    "You MUST follow instructions exactly. " +
    "Return ONLY valid JSON. No markdown. No extra keys. No trailing commas.";

  const completion1 = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    temperature: 0.05,
  });

  const raw1 = completion1.choices[0].message.content ?? "";

  const parsed1 = tryParseJson(raw1);
  if (parsed1.ok) return sanitizeLLMResponse(parsed1.value);

  // Retry (mais agressivo)
  const completion2 = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content:
          prompt +
          "\n\nCRITICAL: Your previous answer was NOT valid JSON. " +
          "Return ONLY valid JSON matching the schema. " +
          "No markdown, no comments, no trailing text.",
      },
    ],
    temperature: 0.0,
  });

  const raw2 = completion2.choices[0].message.content ?? "";
  const parsed2 = tryParseJson(raw2);
  if (parsed2.ok) return sanitizeLLMResponse(parsed2.value);

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

function normalizeLocale(locale?: string): "pt-BR" | "en" {
  if (!locale) return "en";
  const l = locale.toLowerCase();
  if (l.startsWith("pt")) return "pt-BR";
  return "en";
}

/**
 * Patterns that indicate a fabricated/generic weakness that should be filtered out.
 * These patterns match common LLM hallucinations about external dependencies being "weaknesses".
 */
const FORBIDDEN_WEAKNESS_PATTERNS = [
  // English patterns
  /external\s*(library|libraries|dependenc|package)/i,
  /depend(s|ency|encies)\s*on\s*(external|third[- ]party)/i,
  /third[- ]party\s*(library|libraries|dependenc|package)/i,
  /relies\s*on\s*(react|next|vue|angular|express|prisma)/i,
  /framework\s*dependency/i,
  /vendor\s*lock[- ]?in/i,
  /(react|next\.?js|vue|angular|express|nestjs|prisma)\s*(may|could|might)\s*(affect|impact)/i,

  // Portuguese patterns
  /depend[êe]ncia\s*de\s*(bibliotecas?|pacotes?)\s*extern/i,
  /depend[êe]ncia\s*de\s*terceiros/i,
  /bibliotecas?\s*extern/i,
  /depende\s*de\s*(react|next|vue|angular|express|prisma)/i,
  /uso\s*de\s*(react|next|vue|angular)\s*(pode|afeta)/i,
];

/**
 * Sanitizes the LLM response by filtering out fabricated/generic weaknesses.
 * This ensures that criticisms about using standard frameworks/libraries are removed.
 */
function sanitizeLLMResponse(response: any): any {
  if (!response || typeof response !== "object") return response;

  // Filter weaknesses
  if (response.weaknesses && Array.isArray(response.weaknesses)) {
    response.weaknesses = response.weaknesses.filter((weakness: any) => {
      if (!weakness || typeof weakness !== "object") return true;

      const textToCheck = [
        weakness.title || "",
        weakness.explanation || "",
        weakness.description || "",
      ]
        .join(" ")
        .toLowerCase();

      // Check if any forbidden pattern matches
      const isForbidden = FORBIDDEN_WEAKNESS_PATTERNS.some((pattern) =>
        pattern.test(textToCheck)
      );

      if (isForbidden) {
        console.log(`[sanitize] Filtered out fabricated weakness: "${weakness.title}"`);
        return false;
      }

      return true;
    });
  }

  return response;
}

