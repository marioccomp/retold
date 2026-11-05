import { Heuristic } from "./types/heuristic.js";

export type LlmPrivacyMode =
  | "local-only"
  | "metadata-only"
  | "metadata+sanitized-readme"
  | "metadata+sanitized-readme+sanitized-samples";

export type LlmPrivacyDecision = {
  mode: LlmPrivacyMode;
  projectSensitivity: "public" | "private";
  externalLlmAllowed: boolean;
  includeReadme: boolean;
  includeCodeSamples: boolean;
  reason: string;
};

type LlmPrivacyContext = {
  projectVisibility?: string | null;
  repositoryPrivate?: boolean;
};

type PreparedLlmAnalysis = {
  promptAnalysis: Heuristic;
  persistenceAnalysis: Record<string, unknown>;
  redactionsApplied: boolean;
};

const SECRET_NAME_PATTERN =
  /\b(api[_-]?key|secret|token|password|passwd|private[_-]?key|client[_-]?secret|access[_-]?key|refresh[_-]?token|authorization)\b/i;
const INJECTION_PATTERN =
  /(ignore\s+(all|any|previous)|system\s+prompt|developer\s+message|you\s+are\s+chatgpt|exfiltrat|reveal\s+.*secret|print\s+.*token|leak\s+.*key)/i;
export const SENSITIVE_PATH_PATTERN =
  /(secret|credential|token|private|id_rsa|id_dsa|ssh|\.env|pem|key)/i;

function parseBooleanEnv(name: string, defaultValue = false) {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function truncateText(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}\n...[TRUNCATED:${value.length}]`;
}

function stripMarkdownCodeBlocks(value: string) {
  return value.replace(/```[\s\S]*?```/g, "[REDACTED_CODE_BLOCK]");
}

export function redactSensitiveRepositoryText(text: string) {
  let redacted = text;

  redacted = redacted.replace(
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi,
    "[REDACTED_PRIVATE_KEY_BLOCK]"
  );

  redacted = redacted.replace(
    /\b(redis|postgres|postgresql|mysql|mongodb|amqp|http|https):\/\/[^/\s:@]+:([^@\s]+)@/gi,
    (_match, protocol) => `${protocol}://[REDACTED]:[REDACTED]@`
  );

  redacted = redacted.replace(/\bgh[pousr]_[A-Za-z0-9_]+\b/g, "[REDACTED_GITHUB_TOKEN]");
  redacted = redacted.replace(/\bgsk_[A-Za-z0-9_-]+\b/g, "[REDACTED_GROQ_KEY]");
  redacted = redacted.replace(/\bsk-[A-Za-z0-9_-]+\b/g, "[REDACTED_API_KEY]");
  redacted = redacted.replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_ACCESS_KEY]");
  redacted = redacted.replace(
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    "[REDACTED_JWT]"
  );
  redacted = redacted.replace(
    /\b(Bearer|Basic)\s+[A-Za-z0-9\-._~+/]+=*/gi,
    "$1 [REDACTED]"
  );

  redacted = redacted.replace(
    /^(\s*[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|ACCESS_KEY|PRIVATE_KEY|CLIENT_SECRET)[A-Z0-9_]*\s*[:=]\s*).+$/gim,
    "$1[REDACTED]"
  );

  redacted = redacted
    .split("\n")
    .map((line) => {
      if (INJECTION_PATTERN.test(line)) {
        return "[REDACTED_REPOSITORY_INSTRUCTION]";
      }

      return line;
    })
    .join("\n");

  return redacted;
}

/**
 * Same redaction as redactSensitiveRepositoryText, but the result has exactly as
 * many lines as the input: evidence cites line numbers of the real file, so a
 * multi-line private key block becomes one marker per line.
 */
export function redactPreservingLines(content: string) {
  const withoutKeyBlocks = content.replace(
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi,
    (block) => block.split("\n").map(() => "[REDACTED_PRIVATE_KEY_BLOCK]").join("\n")
  );
  return withoutKeyBlocks
    .split("\n")
    .map((line) => redactSensitiveRepositoryText(line))
    .join("\n");
}

function sanitizeReadmeForLlm(readme: string, maxChars: number) {
  const withoutCodeBlocks = stripMarkdownCodeBlocks(readme);
  const redacted = redactSensitiveRepositoryText(withoutCodeBlocks);
  const normalized = redacted
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index, allLines) => line || allLines[index - 1])
    .join("\n")
    .trim();

  return truncateText(normalized, maxChars);
}

function sanitizeCodeSamplesForLlm(
  codeSamples: Heuristic["codeSamples"],
  sampleMaxChars: number
) {
  return (codeSamples ?? [])
    .filter((sample) => !SENSITIVE_PATH_PATTERN.test(sample.relativePath))
    .map((sample) => ({
      relativePath: sample.relativePath,
      language: sample.language,
      reason: sample.reason,
      excerpt: truncateText(redactSensitiveRepositoryText(sample.excerpt), sampleMaxChars),
    }))
    .filter((sample) => sample.excerpt.trim().length > 0);
}

function normalizeLocale(locale?: string): "pt-BR" | "en" | "es" {
  if (!locale) return "en";
  const lower = locale.toLowerCase();
  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("es")) return "es";
  return "en";
}

function buildLocalPrivacyOverview(
  analysis: Heuristic,
  repoName: string,
  title: string | undefined,
  description: string | undefined,
  decision: LlmPrivacyDecision,
  reasonCode: "private_project_protected" | "llm_unavailable"
) {
  const locale = normalizeLocale(analysis.locale);
  const projectName = title?.trim() || repoName;
  const frameworks = analysis.stack.frameworks.slice(0, 3).join(", ") || analysis.summary.appType;
  const languages = analysis.stack.languages.slice(0, 3).join(", ") || analysis.summary.primaryLanguage;
  const infraNotes = [
    analysis.infra.hasDockerfile && "Docker",
    analysis.infra.hasCompose && "Compose",
    analysis.infra.hasTests && "tests",
    analysis.infra.ciProviders.length > 0 && "CI/CD",
  ]
    .filter(Boolean)
    .join(", ");

  if (locale === "pt-BR") {
    return {
      schema_version: "2.1",
      language: "pt-BR",
      meta: {
        primaryLanguage: analysis.summary.primaryLanguage,
        appType: analysis.summary.appType,
        domain: analysis.classification.domain,
        purpose: analysis.classification.purpose,
      },
      summary: {
        title:
          reasonCode === "private_project_protected"
            ? "Resumo protegido por privacidade"
            : "Resumo local da análise",
        paragraphs: [
          `${projectName} foi classificado como um projeto do tipo ${analysis.summary.appType} com base em sinais estruturais do repositório, predominância de ${languages} e organização em diretórios como ${analysis.structure.topLevelDirs.slice(0, 4).join(", ") || "camadas principais"}. ${description ? `A descrição fornecida pelo usuário indica o objetivo "${description}".` : "A interpretação abaixo foi construída apenas com metadados estruturais e classificação local."}`,
          reasonCode === "private_project_protected"
            ? `Para reduzir risco de exfiltração, o conteúdo bruto do repositório não foi enviado ao provedor de LLM porque este projeto foi tratado como sensível por padrão. A visão atual resume apenas sinais estruturais, stack detectada (${frameworks || "não identificada"}) e indicadores operacionais${infraNotes ? ` como ${infraNotes}` : ""}.`
            : `O provedor de LLM não retornou uma resposta utilizável, então esta visão foi gerada localmente com base em metadados estruturais. Isso preserva a privacidade do conteúdo bruto e mantém uma leitura básica do projeto, destacando stack (${frameworks || "não identificada"})${infraNotes ? ` e evidências de ${infraNotes}` : ""}.`,
        ],
      },
      architecture: {
        explanation: `A arquitetura foi inferida a partir da estrutura do repositório e dos sinais heurísticos disponíveis. O projeto apresenta ${analysis.structure.hasAppsDir || analysis.structure.hasPackagesDir ? "organização modular com múltiplas áreas de código" : "organização concentrada em uma única aplicação"} e ${analysis.stats.totalFiles} arquivos mapeados, com ${analysis.stats.sourceFiles} arquivos de código-fonte e ${analysis.stats.configFiles} arquivos de configuração.`,
      },
      strengths: [
        {
          name: "Metadados estruturais preservados",
          explanation:
            "Mesmo em modo restritivo, a análise local mantém os principais sinais de stack, estrutura e infraestrutura sem depender de conteúdo bruto do repositório.",
        },
      ],
      suggestions: [],
      privacy_mode: decision.mode,
    };
  }

  if (locale === "es") {
    return {
      schema_version: "2.1",
      language: "es",
      meta: {
        primaryLanguage: analysis.summary.primaryLanguage,
        appType: analysis.summary.appType,
        domain: analysis.classification.domain,
        purpose: analysis.classification.purpose,
      },
      summary: {
        title:
          reasonCode === "private_project_protected"
            ? "Resumen protegido por privacidad"
            : "Resumen local del análisis",
        paragraphs: [
          `${projectName} fue clasificado como un proyecto de tipo ${analysis.summary.appType} a partir de señales estructurales del repositorio, predominio de ${languages} y organización en directorios como ${analysis.structure.topLevelDirs.slice(0, 4).join(", ") || "capas principales"}. ${description ? `La descripción proporcionada por el usuario indica el objetivo "${description}".` : "La interpretación siguiente fue construida solo con metadatos estructurales y clasificación local."}`,
          reasonCode === "private_project_protected"
            ? `Para reducir el riesgo de exfiltración, el contenido bruto del repositorio no fue enviado al proveedor de LLM porque este proyecto fue tratado como sensible por defecto. La vista actual resume únicamente señales estructurales, stack detectado (${frameworks || "no identificado"}) e indicadores operativos${infraNotes ? ` como ${infraNotes}` : ""}.`
            : `El proveedor de LLM no devolvió una respuesta utilizable, por lo que esta vista fue generada localmente usando metadatos estructurales. Esto preserva la privacidad del contenido bruto y mantiene una lectura básica del proyecto, destacando stack (${frameworks || "no identificado"})${infraNotes ? ` y evidencias de ${infraNotes}` : ""}.`,
        ],
      },
      architecture: {
        explanation: `La arquitectura fue inferida a partir de la estructura del repositorio y de las señales heurísticas disponibles. El proyecto presenta ${analysis.structure.hasAppsDir || analysis.structure.hasPackagesDir ? "una organización modular con múltiples áreas de código" : "una organización concentrada en una única aplicación"} y ${analysis.stats.totalFiles} archivos mapeados, con ${analysis.stats.sourceFiles} archivos fuente y ${analysis.stats.configFiles} archivos de configuración.`,
      },
      strengths: [
        {
          name: "Metadatos estructurales preservados",
          explanation:
            "Incluso en modo restrictivo, el análisis local mantiene las principales señales de stack, estructura e infraestructura sin depender del contenido bruto del repositorio.",
        },
      ],
      suggestions: [],
      privacy_mode: decision.mode,
    };
  }

  return {
    schema_version: "2.1",
    language: "en",
    meta: {
      primaryLanguage: analysis.summary.primaryLanguage,
      appType: analysis.summary.appType,
      domain: analysis.classification.domain,
      purpose: analysis.classification.purpose,
    },
    summary: {
      title:
        reasonCode === "private_project_protected"
          ? "Privacy-protected project summary"
          : "Local project summary",
      paragraphs: [
        `${projectName} was classified as a ${analysis.summary.appType} project based on repository structure, dominant ${languages}, and directories such as ${analysis.structure.topLevelDirs.slice(0, 4).join(", ") || "the main source areas"}. ${description ? `The user-provided description indicates the goal "${description}".` : "The summary below was derived only from structural metadata and local heuristics."}`,
        reasonCode === "private_project_protected"
          ? `To reduce exfiltration risk, raw repository content was not sent to the external LLM provider because this project was treated as sensitive by default. This view summarizes only structural signals, detected stack (${frameworks || "not identified"}), and operational evidence${infraNotes ? ` such as ${infraNotes}` : ""}.`
          : `The external LLM provider did not return a usable response, so this view was generated locally from structural metadata. That preserves raw repository privacy while still surfacing a basic interpretation of the project, highlighting the detected stack (${frameworks || "not identified"})${infraNotes ? ` and ${infraNotes}` : ""}.`,
      ],
    },
    architecture: {
      explanation: `The architecture was inferred from repository structure and heuristic signals. The project shows ${analysis.structure.hasAppsDir || analysis.structure.hasPackagesDir ? "a modular layout with multiple code areas" : "a concentrated single-application layout"} across ${analysis.stats.totalFiles} mapped files, with ${analysis.stats.sourceFiles} source files and ${analysis.stats.configFiles} configuration files.`,
    },
    strengths: [
      {
        name: "Structural metadata preserved",
        explanation:
          "Even in restrictive mode, the local analysis keeps the main stack, structure, and infrastructure signals without depending on raw repository content.",
      },
    ],
    suggestions: [],
    privacy_mode: decision.mode,
  };
}

export function buildLlmPrivacyDecision(context: LlmPrivacyContext): LlmPrivacyDecision {
  const isSensitiveProject =
    context.projectVisibility === "private" || context.repositoryPrivate === true;

  const allowPrivateProjects = parseBooleanEnv("WORKER_LLM_ALLOW_PRIVATE_PROJECTS", true);
  const includePublicReadme = parseBooleanEnv("WORKER_LLM_INCLUDE_PUBLIC_README", true);
  const includePublicCodeSamples = parseBooleanEnv("WORKER_LLM_INCLUDE_PUBLIC_CODE_SAMPLES", true);

  if (isSensitiveProject) {
    if (!allowPrivateProjects) {
      return {
        mode: "local-only",
        projectSensitivity: "private",
        externalLlmAllowed: false,
        includeReadme: false,
        includeCodeSamples: false,
        reason: "private project external LLM disabled by environment",
      };
    }

    return {
      mode: "metadata+sanitized-readme",
      projectSensitivity: "private",
      externalLlmAllowed: true,
      includeReadme: true,
      includeCodeSamples: false,
      reason: "private project uses sanitized README plus metadata, without sharing code samples",
    };
  }

  if (includePublicReadme && includePublicCodeSamples) {
    return {
      mode: "metadata+sanitized-readme+sanitized-samples",
      projectSensitivity: "public",
      externalLlmAllowed: true,
      includeReadme: true,
      includeCodeSamples: true,
      reason: "public project uses sanitized README and sanitized code samples by default",
    };
  }

  if (includePublicReadme) {
    return {
      mode: "metadata+sanitized-readme",
      projectSensitivity: "public",
      externalLlmAllowed: true,
      includeReadme: true,
      includeCodeSamples: false,
      reason: "public project uses sanitized README without code samples",
    };
  }

  return {
    mode: "metadata-only",
    projectSensitivity: "public",
    externalLlmAllowed: true,
    includeReadme: false,
    includeCodeSamples: false,
    reason: "public project metadata-only mode explicitly forced by environment",
  };
}

export function prepareAnalysisForLlm(
  analysis: Heuristic,
  decision: LlmPrivacyDecision
): PreparedLlmAnalysis {
  const maxReadmeChars = Number(process.env.WORKER_LLM_MAX_README_CHARS ?? 4000);
  const maxCodeSampleChars = Number(process.env.WORKER_LLM_MAX_CODE_SAMPLE_CHARS ?? 1600);

  const sanitizedReadme =
    decision.includeReadme && analysis.readme
      ? sanitizeReadmeForLlm(analysis.readme, maxReadmeChars)
      : undefined;

  const sanitizedCodeSamples = decision.includeCodeSamples
    ? sanitizeCodeSamplesForLlm(analysis.codeSamples, maxCodeSampleChars)
    : [];

  const promptAnalysis: Heuristic = {
    ...analysis,
    readme: sanitizedReadme,
    codeSamples: sanitizedCodeSamples,
  };

  const persistenceAnalysis: Record<string, unknown> = {
    summary: analysis.summary,
    stack: analysis.stack,
    infra: analysis.infra,
    stats: analysis.stats,
    structure: analysis.structure,
    classification: analysis.classification,
    privacy: {
      llmMode: decision.mode,
      projectSensitivity: decision.projectSensitivity,
      readmeSharedWithLlm: Boolean(sanitizedReadme),
      codeSamplesSharedWithLlm: sanitizedCodeSamples.length,
    },
  };

  const redactionsApplied =
    Boolean(sanitizedReadme && sanitizedReadme !== analysis.readme) ||
    sanitizedCodeSamples.some((sample, index) => sample.excerpt !== analysis.codeSamples?.[index]?.excerpt);

  return {
    promptAnalysis,
    persistenceAnalysis,
    redactionsApplied,
  };
}

export function buildLocalLlmFallback(
  analysis: Heuristic,
  repoName: string,
  title: string | undefined,
  description: string | undefined,
  decision: LlmPrivacyDecision,
  reasonCode: "private_project_protected" | "llm_unavailable"
) {
  return buildLocalPrivacyOverview(analysis, repoName, title, description, decision, reasonCode);
}
