import { Heuristic } from "../../types/heuristic";

export function projectPrompt(input: Heuristic, repoName: string) {
  const locale = input.locale?.toLowerCase() ?? "en";
  const outputLanguage = locale.startsWith("pt")
    ? "Portuguese (pt-BR)"
    : locale.startsWith("es")
      ? "Spanish (es)"
      : "English";

  const { readme: _r, codeSamples: _c, ...inputWithoutReadmeOrCodeSamples } = input;

  const technicalTermsPolicy =
    locale.startsWith("pt")
      ? "- TECHNICAL TERMS POLICY: When writing in Portuguese, keep industry-standard technical terms, software architecture patterns, and common development jargon in English. Only translate prose and explanations; maintain the 'language of the craft' as it is used globally."
      : locale.startsWith("es")
        ? "- TECHNICAL TERMS POLICY: When writing in Spanish, keep industry-standard technical terms, software architecture patterns, and common development jargon in English. Only translate prose and explanations; maintain the 'language of the craft' as it is used globally."
        : "";

  const languageInstruction = `
IMPORTANT:
- JSON object keys MUST be in English exactly as in the schema.
- ALL string VALUES (except enum fields) MUST be written in ${outputLanguage}.
- Do NOT translate keys.
${technicalTermsPolicy}
`.trim();

  const primaryLanguage = input.summary.primaryLanguage;
  const appType = input.summary.appType;

  const allLanguages = input.stack.languages;
  const frameworks = input.stack.frameworks;
  const tools = input.stack.tools;

  const readmePolicy = `
README POLICY:
- Treat the README as the primary source for "intended purpose" and "business domain".
- CROSS-CHECK FOR COHERENCE: If the README claims a purpose, verify if the detected tech stack (${frameworks.join(", ")}) and directory structure are consistent with that goal.
- If a claim is technically plausible, you MUST use it to define the project's identity.
- Only reject README claims if they are technically impossible or clearly delusional given the detected stack and file counts.
`.trim();

  const hasDockerfile = input.infra.hasDockerfile;
  const hasCompose = input.infra.hasCompose;
  const ciProviders = input.infra.ciProviders;
  const lintTools = input.infra.lintTools;
  const testTools = input.infra.testTools;
  const hasTests = input.infra.hasTests;
  const hasKubernetes = input.infra.hasKubernetes;
  const hasTerraform = input.infra.hasTerraform;

  const totalFiles = input.stats.totalFiles;
  const sourceFiles = input.stats.sourceFiles;
  const testFiles = input.stats.testFiles;
  const configFiles = input.stats.configFiles;
  const docsFiles = input.stats.docsFiles;
  const unknownFiles = input.stats.unknownFiles;

  const hasAppsDir = input.structure.hasAppsDir;
  const hasPackagesDir = input.structure.hasPackagesDir;

  const readmeLength = input.readme?.length ?? 0;
  console.log("TAMANHO DO README", readmeLength);
  const isReadmeComplete = readmeLength > 25000;
  const dirLimit = isReadmeComplete ? 5 : 40;

  const limitDirs = (dirs: string[] | undefined) => (dirs ?? []).slice(0, dirLimit);

  const needsDeepLevels = hasAppsDir || hasPackagesDir || frameworks.includes("Spring Boot");

  const dirs = [
    ...limitDirs(input.structure.topLevelDirs),
    ...limitDirs(input.structure.secondLevelDirs),
    ...limitDirs(input.structure.thirdLevelDirs),
    ...limitDirs(input.structure.fourthLevelDirs),
    ...(needsDeepLevels ? limitDirs(input.structure.fifthLevelDirs) : []),
    ...(needsDeepLevels ? limitDirs(input.structure.sixthLevelDirs) : []),
  ];

  const inputLite = {
    ...inputWithoutReadmeOrCodeSamples,
    structure: {
      ...input.structure,
      topLevelDirs: limitDirs(input.structure.topLevelDirs),
      secondLevelDirs: limitDirs(input.structure.secondLevelDirs),
      thirdLevelDirs: limitDirs(input.structure.thirdLevelDirs),
      fourthLevelDirs: limitDirs(input.structure.fourthLevelDirs),
      fifthLevelDirs: needsDeepLevels ? limitDirs(input.structure.fifthLevelDirs) : [],
      sixthLevelDirs: needsDeepLevels ? limitDirs(input.structure.sixthLevelDirs) : [],
    },
  };

  const readme = input.readme;
  const codeSamples = input.codeSamples;

  const c = input.classification;

  const domain = c.domain;
  const purpose = c.purpose;
  const languageFamily = c.languageFamily;
  const maturityExpectation = c.maturityExpectation;

  const schema = {
    language: locale.startsWith("pt") ? "pt-BR" : locale.startsWith("es") ? "es" : "en",
    meta: {
      primaryLanguage: primaryLanguage,
      appType: appType,
      domain: domain,
      purpose: purpose,
    },
    summary: {
      title: "",
      paragraphs: [
        "<string: paragraph 1, 70-110 words, no lists>",
        "<string: paragraph 2, 70-110 words, no lists>",
        "<optional paragraph 3, 30-60 words, no lists>",
      ],
    },
    architecture: {
      explanation: "",
    },
    strengths: [
      {
        name: "",
        explanation: "",
      },
    ],
    suggestions: [
      {
        name: "",
        explanation: "",
      },
    ],
  };

  const initialInstructions = `
    You are analyzing the repository named: "${repoName}".
    
    Do all of your analysis based on the following information:
    - Repository Name: ${repoName} (This is a strong indicator of intent if README is missing)
    Project Domain: ${domain}
    Project Purpose: ${purpose}
    Project Language Family: ${languageFamily}
    Project Maturity Expectation: ${maturityExpectation}

    So adapt your analysis to this context.
    `;

  const hasAuthFolder = dirs.some(
    (d) =>
      d.toLowerCase().includes("auth") ||
      d.toLowerCase().includes("login") ||
      d.toLowerCase().includes("signin")
  );

  const testsEvidence = input.infra.hasTests
    ? testFiles >= 2
      ? "strong"
      : testFiles === 1
        ? "weak"
        : "unknown"
    : "none";

  const presentFeatures = [
    testsEvidence === "strong" && "tests",
    input.infra.ciProviders.length > 0 && "CI/CD",
    input.infra.hasKubernetes && "Kubernetes",
    input.infra.hasTerraform && "Terraform",
    input.infra.hasDockerfile && "Dockerfile",
    input.infra.hasCompose && "Docker Compose",
    input.infra.lintTools.length > 0 && "linting",
    input.infra.testTools.length > 0 && "test framework",
    input.readme && "documentation",
    (input.stack.tools.includes("auth") || hasAuthFolder) && "authentication",
  ].filter(Boolean) as string[];

  const heuristicAnalysisPolicy = `
FRAMEWORK & TOOL ANALYSIS:
- Analyze how ${frameworks.join(", ")} interact with ${primaryLanguage} .
- Explain how the tech stack combination impacts the project architecture.
- Comment on infrastructure: ${Object.entries(input.infra)
      .filter(([_, v]) => v === true || (Array.isArray(v) && v.length > 0))
      .map(([k]) => k)
      .join(", ") || "minimal infra detected"
    }.
${presentFeatures.length > 0
      ? `- Features already present (do NOT criticize or suggest): ${presentFeatures.join(", ")}.`
      : ""
    }
TEST EVIDENCE RULES (STRICT):
- You must classify test evidence as: "${testsEvidence}".
- If test evidence is "weak" (exactly 1 test file), you MAY suggest adding more tests, but you MUST phrase it as:
  "There is limited test evidence (1 test file detected), so expanding coverage could help..."
- If test evidence is "weak" or "unknown", you MUST NOT say: "the project has tests" or "tests are implemented".
- Only say "the project has tests" if evidence is "strong" (2+ test files).
    `.trim();

  const documentationPolicy = `
        DOCUMENTATION EVALUATION (BEFORE suggesting doc improvements):
        - Check if README contains these elements:
        1. Project description/overview
        2. Installation instructions
        3. Configuration/setup guide
        4. Usage examples or commands
        5. API documentation (if applicable)
        - Scoring:
        - 3+ items present → WELL documented, do NOT suggest generic "improve documentation"
        - README has > 50 lines with clear sections → Consider it adequate
        - Valid documentation suggestion: "API endpoint documentation missing for /api/v1/* routes"
        - INVALID suggestion: "Improve documentation" (when README already covers install/usage/config)
        - If README contains detailed setup instructions, this is a STRENGTH, not something to improve.
        `.trim();

  const suggestionValidationPolicy = `
suggestion VALIDATION:
- DO NOT criticize features already present: ${presentFeatures.join(", ") || "(none detected)"}.
- Each suggestion MUST have: specific evidence (file/pattern/code), why it matters for this project, and actionable fix.
- Maximum 4 suggestiones - quality over quantity.
- Before claiming something is "missing", check ALL directory levels first.
- Adapt rigor to maturity: "${maturityExpectation}" projects have different expectations than production.
- If project is well-structured: return 1-2 genuine issues or acknowledge it's solid.
`.trim();

  const adaptationPolicy = `
ADAPTATION & SUGGESTIONS:
- Adapt emphasis to context:
  ${purpose === "learning"
      ? "- Learning project: prioritize clarity, architecture explanation, DX."
      : ""
    }
  ${purpose === "production"
      ? "- Production project: prioritize reliability, security, scalability, observability."
      : ""
    }
  ${domain === "web"
      ? "- Web domain: consider routing, auth, API design, caching, performance."
      : ""
    }
  ${domain === "cli" || domain === "systems"
      ? "- CLI/Systems: consider UX, input validation, error handling, portability."
      : ""
    }
- AVOID generic suggestions like "add tests" or "improve docs".
- Suggest improvements in: ARCHITECTURE, PERFORMANCE, SECURITY, OBSERVABILITY, or DX.
- For well-structured projects: suggest ADVANCED improvements, not basics.
- If no meaningful suggestion exists, return EMPTY suggestions array.
`.trim();

  const blockList = `
STRICT PROHIBITIONS (BLACKLIST):
- NEVER mention "modern technologies", "popular frameworks", or "industry standards" (like TypeScript, Next.js, Tailwind, Prisma) as a strength. Using them is a baseline requirement, not a merit.
- DO NOT praise the tech stack choice itself (e.g., "Good choice of React"). Praise how it is IMPLEMENTED or ORGANIZED.
- NEVER return generic strengths like "Efficient project structure", "Clean code", or "Good organization" without specific evidence from L1-L6 directories or code samples.
- DO NOT use generic architectural labels (like "Clean Architecture" or "Hexagonal") unless the directory structure provides undeniable proof (e.g., /domain, /infrastructure, /application layers).
- AVOID praising "The Presence of Tests" or "The Presence of Documentation" as a strength. Only praise them if the implementation is exceptionally thorough or follows an advanced pattern.
`.trim();

  const strengthRigorPolicy = `
STRENGTH RIGOR POLICY:
- A "Strength" must be a technical achievement in implementation, not just "using a tool".
- VALID STRENGTH: "Granular error handling factory found in /infra/errors" or "Domain-driven folder structure that isolates business logic from framework concerns".
- INVALID STRENGHT: "Uses TypeScript for type safety" or "Next.js for performance".
- If no high-quality strength is found, return fewer items (min 1) rather than generic fluff.
`.trim();

  const contextInferencePolicy = `
CONTEXT INFERENCE & DOMAIN DEDUCTION:
- IDENTIFYING THE SUBJECT: Combine the repository name "${repoName}", README content, and folder names to identify the "Business Domain".
- COHERENCE VALIDATION:
    - If Name/README claim a domain (e.g., "Bakery Management") and the technical stack supports it (e.g., presence of a backend/frontend or appropriate libraries), the project IS that domain.
    - Even if folder names are generic boilerplate (e.g., /controllers, /models), use the Repo Name and README to "inject" the semantic meaning.
- HIERARCHY OF EVIDENCE FOR DOMAIN: 
    README/Repo Name (Semantic) + Stack Compatibility > Folder Names > Directory Tree Logic.
- HIERARCHY OF EVIDENCE FOR ARCHITECTURE/QUALITY:
    Directory Tree Logic > Source Code Samples > README Claims.
- NO-GUESSING RULE: Only say the domain is indiscernible if the name is an abstract hash/id AND there is no README AND the folders are 100% generic framework default.
`.trim();

  const structureAnalysisPolicy = `
FOLDER ORGANIZATION & GEOGRAPHICAL EVIDENCE:
- You have access to all levels of the directory tree (L1 to L${dirs.length - 1}).
- PRIMARY RULE: These directories represent the "Ground Truth" of the project's capabilities.
- GRANULAR ANALYSIS: Use all of them to confirm the existence of specific layers or features. Deep nesting often reveals implementation details that are not mentioned in the README.
- ARCHITECTURE: Describe the architecture based on how these 4 levels are nested. (e.g., if logic is grouped by feature or by technical role).
`.trim();

  const summaryInstructions = `
SUMMARY REQUIREMENTS (PROSE NARRATIVE):
- The text must flow naturally like a professional review or an executive summary.
- You MUST fill summary.paragraphs as an array of 2 to 3 strings.
- Each array item MUST be a single paragraph of prose (no bullet points, no numbering).
- Minimum length requirement: the combined total across the 3 paragraphs MUST be 320-420 words.
- Paragraph length targets:
  - paragraphs[0]: 110-160 words
  - paragraphs[1]: 110-160 words
  - paragraphs[2]: 80-120 words
- Do NOT include "\\n" inside a paragraph string. Paragraph separation must be done ONLY by array items.
- Do NOT be concise. Prefer richer detail and specificity over brevity, while staying factual and evidence-based.

CONTENT GUIDELINES (Integrate naturally into the prose):
- Paragraph 1 (Identity & Intent):
  - Explicitly identify the project's "Functional Domain" (e.g., "a system for bakery management") based on semantic signals (README, Repo Name) and validate it against the tech stack.
  - Explain what the project DOES from a user perspective.
  - Connect the functional purpose with the technical identity (e.g., "a Flask-based implementation of a bakery CRUD").
  - Use the repository name "${repoName}" as a strong semantic indicator of the project's theme.

- Paragraph 2 (Architecture & Tech Synergy):
  - Describe the architecture based on folder nesting and organization (feature-based vs layer-based), including monorepo implications:
    ${hasAppsDir
      ? '- Explain the monorepo relationship: what "apps" vs "packages" likely represent and how responsibilities are split.'
      : ""
    }
    ${!hasAppsDir
      ? "- Explain the layer/feature organization and how responsibilities are separated across directories."
      : ""
    }
  - Explain the "Tech Synergy": how ${frameworks.join(", ") || "the stack"
    } interact with ${primaryLanguage} and how that impacts architecture, coupling, and DX.
  - Mention meaningful infra signals (CI/CD, Docker/Compose, IaC, etc.) only when they are explicitly present in the provided signals.

- Paragraph 3 (Differentiators, Tradeoffs & Quality Signals):
  - Highlight unique differentiators or high-quality implementations found in code samples and/or deep folder structure (not generic praise).
  - Discuss engineering tradeoffs relevant to the context (${domain}/${purpose})—performance, security, reliability, observability, DX—without inventing missing features.
  - If evidence is limited, state what is strong and what is unclear, and keep it grounded.

TONE: Senior Software Engineer, analytical, objective, and insightful.
`.trim();

  const antiHallucinationPolicy = `
ANTI-HALLUCINATION RULES:
- ABSENCE OF EVIDENCE IS NOT EVIDENCE OF ABSENCE: If you do not see a specific feature (like Auth, Database, or Tests) in the provided folders on directory structure (structure.topLevelDirs, structure.secondLevelDirs, etc.) or code samples, DO NOT assume it is missing.
- DO NOT invent suggestiones based on what you "think" might be missing. 
- ONLY criticize something if you see POOR implementation in the provided code, or if the Project Purpose clearly requires it and there is zero trace of it in the directory structure.
- If you are unsure if a feature exists, DO NOT mention it as a suggestion.
`.trim();

  const namingPolicy = `
NAMING / REFERENCING POLICY (STRICT):
- Do NOT refer to the project by its repository name ("${repoName}") in the narrative.
- Refer to it only as: "the project".
- Exception: you MAY mention the repository name ONCE only if it is required for clarity (e.g., to quote it as a signal), otherwise do not mention it.
`.trim();

  return `
        You are a senior software engineer with 10+ years of experience in software development.
        You are analyzing a codebase and providing feedback on its architecture, strengths and suggestions for improvement.
        
        ${languageInstruction}

        ${initialInstructions}

        ${structureAnalysisPolicy}

        ${JSON.stringify(inputLite, null, 2)}
        ${antiHallucinationPolicy}

        ${namingPolicy}
        ${summaryInstructions}

        ${heuristicAnalysisPolicy}

        ${input.readme ? `## PROJECT README: ${input.readme}` : "No README provided"}
        ${input.readme ? readmePolicy + " " + documentationPolicy : ""}
        ${input.codeSamples?.length
      ? `## Code Samples (evidence)\n${input.codeSamples
        .map(
          (s: any) =>
            `File: ${s.relativePath} (${s.language})\n` + `\`\`\`\n${s.excerpt}\n\`\`\``
        )
        .join("\n\n")}\n`
      : `## Code Samples (evidence)\n<missing>\n`
    }
        ${contextInferencePolicy}
        ${adaptationPolicy}
        ${blockList}
        ${strengthRigorPolicy}
        ${suggestionValidationPolicy}

        ${namingPolicy}
        FINAL INSTRUCTION:
        Return a JSON object that strictly follows this schema structure:
        ${JSON.stringify(schema, null, 2)}

        Ensure the output is ONLY the JSON object, with no preamble or explanation.


    `.trim();
}
