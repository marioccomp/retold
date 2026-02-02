import { ProjectClassification } from "../analyze/classify-project.js";
import { Heuristic } from "../types/heuristic.js";
import { groq } from "./groq-client.js";
import { projectOverviewPrompt } from "./prompts/project-overview.js";

export async function analyzeProjectWithLLM(analysis: Heuristic) {
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

  console.log("[LLM] Raw response (first attempt):", raw1.slice(0, 2000));

  const parsed1 = tryParseJson(raw1);
  if (parsed1.ok) return sanitizeLLMResponse(parsed1.value, analysis);

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
  if (parsed2.ok) return sanitizeLLMResponse(parsed2.value, analysis);

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
 * Patterns for test-related weaknesses that should be filtered when tests exist
 */
const TEST_WEAKNESS_PATTERNS = [
  // English
  /lack\s*of\s*tests?/i,
  /missing\s*(unit\s*)?tests?/i,
  /no\s*(automated\s*)?tests?/i,
  /without\s*tests?/i,
  /tests?\s*are\s*missing/i,
  /absence\s*of\s*tests?/i,

  // Portuguese
  /falta\s*de\s*testes?/i,
  /sem\s*testes?/i,
  /aus[êe]ncia\s*de\s*testes?/i,
  /n[ãa]o\s*(possui|tem|h[áa])\s*testes?/i,
  /testes?\s*(automatizados?\s*)?(ausentes?|faltando|inexistentes?)/i,
];

/**
 * Patterns for test-related suggestions that should be filtered when test framework exists
 */
const TEST_SUGGESTION_PATTERNS = [
  // English - catch variations
  /implement\s*(automated\s*)?tests?/i,
  /add\s*(automated\s*)?(unit\s*)?tests?/i,
  /create\s*(unit\s*)?tests?/i,
  /use\s*(jest|vitest|mocha|pytest)/i,
  /introduce\s*(automated\s*)?testing/i,
  /(testing\s*)?(library|framework)\s*(like|such as|como)\s*(jest|vitest|mocha)/i,
  /unit\s*tests?\s*(for|para)/i,

  // Portuguese - catch variations
  /implementar\s*testes?/i,
  /adicionar\s*testes?\s*(unit[áa]rios?|automatizados?)?/i,
  /criar\s*testes?\s*(unit[áa]rios?)?/i,
  /utilizar\s*.*(jest|vitest|mocha|pytest)/i,  // catch "utilizar uma biblioteca ... Jest"
  /biblioteca\s*de\s*testes?\s*(como|like)\s*(jest|vitest)/i,
  /introduzir\s*testes?/i,
  /testes?\s*unit[áa]rios?\s*(para|for)/i,
];

/**
 * Patterns for documentation-related suggestions that should be filtered when README is substantial
 */
const DOC_SUGGESTION_PATTERNS = [
  // English - only generic ones
  /^improve\s*documentation$/i,
  /^add\s*documentation$/i,
  /^better\s*documentation$/i,
  /^enhance\s*documentation$/i,

  // Portuguese - only generic ones
  /^melhorar\s*(a\s*)?documenta[çc][ãa]o$/i,
  /^adicionar\s*documenta[çc][ãa]o$/i,
  /^aprimorar\s*(a\s*)?documenta[çc][ãa]o$/i,
];

/**
 * Sanitizes the LLM response by filtering out fabricated/generic weaknesses and suggestions.
 * Uses the analysis context to make informed decisions about what to filter.
 */
function sanitizeLLMResponse(response: any, analysis: Heuristic): any {
  if (!response || typeof response !== "object") return response;

  // Check if test framework exists in stack
  const testToolsInStack = analysis.stack?.tools?.filter((t) =>
    /jest|vitest|mocha|pytest|rspec|junit|phpunit|testify/i.test(t)
  ) ?? [];
  const hasTestFramework = testToolsInStack.length > 0 || (analysis.infra?.testTools?.length ?? 0) > 0;
  const hasTestFiles = (analysis.stats?.testFiles ?? 0) > 0;
  const hasTests = hasTestFramework || hasTestFiles;

  // Check if README is substantial
  const hasSubstantialReadme = (analysis.readme?.length ?? 0) > 200;

  console.log(`[sanitize] Context: hasTests=${hasTests}, hasTestFramework=${hasTestFramework}, hasTestFiles=${hasTestFiles}, testToolsInStack=${testToolsInStack.join(",")}, hasSubstantialReadme=${hasSubstantialReadme}`);

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
      const isForbiddenDependency = FORBIDDEN_WEAKNESS_PATTERNS.some((pattern) =>
        pattern.test(textToCheck)
      );

      if (isForbiddenDependency) {
        console.log(`[sanitize] Filtered out fabricated dependency weakness: "${weakness.title}"`);
        return false;
      }

      // Filter test-related weaknesses if tests exist
      if (hasTests) {
        const isTestWeakness = TEST_WEAKNESS_PATTERNS.some((pattern) =>
          pattern.test(textToCheck)
        );
        if (isTestWeakness) {
          console.log(`[sanitize] Filtered out invalid test weakness (tests exist): "${weakness.title}"`);
          return false;
        }
      }

      return true;
    });
  }

  // Filter suggestions
  if (response.suggestions && Array.isArray(response.suggestions)) {
    response.suggestions = response.suggestions.filter((suggestion: any) => {
      if (!suggestion || typeof suggestion !== "object") return true;

      const textToCheck = [
        suggestion.title || "",
        suggestion.recommended_action || "",
        suggestion.rationale || "",
      ]
        .join(" ");

      // Filter test implementation suggestions if test framework already exists
      if (hasTestFramework) {
        const isTestSuggestion = TEST_SUGGESTION_PATTERNS.some((pattern) =>
          pattern.test(textToCheck)
        );
        if (isTestSuggestion) {
          console.log(`[sanitize] Filtered out invalid test suggestion (framework exists): "${suggestion.title}"`);
          return false;
        }
      }

      // Filter generic documentation suggestions if README is substantial
      if (hasSubstantialReadme) {
        const title = (suggestion.title || "").trim();
        const isGenericDocSuggestion = DOC_SUGGESTION_PATTERNS.some((pattern) =>
          pattern.test(title)
        );
        if (isGenericDocSuggestion) {
          console.log(`[sanitize] Filtered out generic doc suggestion (README exists): "${suggestion.title}"`);
          return false;
        }
      }

      return true;
    });
  }

  return response;
}

