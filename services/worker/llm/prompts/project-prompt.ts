import { Heuristic } from "../../types/heuristic";


export function projectPrompt(input: Heuristic, repoName: string) {
    const isPt = input.locale?.toLowerCase().startsWith("pt");

    const outputLanguage = isPt ? "pt-BR" : "en";

    const { readme: _r, codeSamples: _c, ...inputWithoutReadmeOrCodeSamples } = input;

    const languageInstruction = `
IMPORTANT:
- JSON object keys MUST be in English exactly as in the schema.
- ALL string VALUES (except enum fields) MUST be written in ${outputLanguage}.
- Do NOT translate keys.
- ${outputLanguage === "pt-BR" ? "- TECHNICAL TERMS POLICY: When writing in Portuguese, keep industry-standard technical terms, software architecture patterns, and common development jargon in English. Only translate prose and explanations; maintain the 'language of the craft' as it is used globally." : ""}
`.trim();

    const readmePolicy = `
README POLICY:
- Treat the README as "project claims" and "intended purpose", not as ground truth.
- Cross-check README claims against repository signals (structure, stack, infra, stats, and code samples).
- If README says something that is not supported by evidence in the repo context, does not take as true.
- If README is missing or too thin, infer purpose/domain from code and structure.
`.trim();



    const primaryLanguage = input.summary.primaryLanguage;
    const appType = input.summary.appType;

    const allLanguages = input.stack.languages;
    const frameworks = input.stack.frameworks;
    const tools = input.stack.tools;

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
        }
    };


    const readme = input.readme;
    const codeSamples = input.codeSamples;

    const c = input.classification;

    const domain = c.domain;
    const purpose = c.purpose;
    const languageFamily = c.languageFamily;
    const maturityExpectation = c.maturityExpectation;

    const schema = {
        language: input.locale?.startsWith("pt") ? "pt-BR" : "en",
        meta: {
            primaryLanguage: primaryLanguage,
            appType: appType,
            domain: domain,
            purpose: purpose,
        },
        summary: {
            title: "",
            description: "<string: cohesive narrative text, 150-250 words, structured in paragraphs. DO NOT use bullet points or lists.>",
        },
        architecture: {
            explanation: "",
        },
        strengths: [
            {
                name: "",
                explanation: "",
            }
        ],
        suggestions: [
            {
                name: "",
                explanation: "",
            }
        ]
    }

    const initialInstructions = `
    You are analyzing the repository named: "${repoName}".
    
    Do all of your analysis based on the following information:
    - Repository Name: ${repoName} (This is a strong indicator of intent if README is missing)
    Project Domain: ${domain}
    Project Purpose: ${purpose}
    Project Language Family: ${languageFamily}
    Project Maturity Expectation: ${maturityExpectation}

    So adapt your analysis to this context.
    `

    const hasAuthFolder = dirs.some(d => d.toLowerCase().includes("auth") || d.toLowerCase().includes("login") || d.toLowerCase().includes("signin"));

    const presentFeatures = [
        input.infra.hasTests && "tests",
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
- Comment on infrastructure: ${Object.entries(input.infra).filter(([_, v]) => v === true || (Array.isArray(v) && v.length > 0)).map(([k]) => k).join(", ") || "minimal infra detected"}.
${presentFeatures.length > 0 ? `- Features already present (do NOT criticize or suggest): ${presentFeatures.join(", ")}.` : ""}
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
  ${purpose === "learning" ? "- Learning project: prioritize clarity, architecture explanation, DX." : ""}
  ${purpose === "production" ? "- Production project: prioritize reliability, security, scalability, observability." : ""}
  ${domain === "web" ? "- Web domain: consider routing, auth, API design, caching, performance." : ""}
  ${domain === "cli" || domain === "systems" ? "- CLI/Systems: consider UX, input validation, error handling, portability." : ""}
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
- THE NAME CHALLENGE: The repository name "${repoName}" may be a creative brand, an acronym, or a metaphor. Avoid literal translation unless it matches industry-standard technical naming (e.g., "auth-service").
- DUAL-TRACK ANALYSIS:
    1. TRACK A (Technical Markers): Scan the directory tree (L1 to L${dirs.length}) for structural markers of intent (e.g., controllers for APIs, components for UI, schemas for data, or scrapers for ingestion).
    2. TRACK B (Abstract to Concrete): If the name is non-obvious, identify the "Functional Core" by looking for the directory with the most complex nesting or unique naming. 
- HIERARCHY OF EVIDENCE: 
    Directory Tree Logic > Source Code Patterns > README Claims > Repository Name.
- DEDUCTION PROTOCOL:
    - Use the deep directory levels to "de-mask" creative project names. 
    - Example Logic: If a project named "Astra" has directories for "trading", "exchange", and "wallets", deduce the domain is Finance, regardless of the brand name.
- NO-GUESSING RULE: If the directory structure is purely boilerplate (e.g., just framework defaults) and the name is abstract, state that the project's specific domain is "not yet discernible from the current structure."
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
- Write a COHESIVE, PROFESSIONAL NARRATIVE of 150-250 words.
- Use 2 to 3 well-structured paragraphs.
- ⚠️ STRICT RULE: DO NOT use bullet points, numbered lists, or "line-by-line" sentences.
- The text must flow naturally like a professional review or an executive summary.

CONTENT GUIDELINES (Integrate these naturally into the prose):
- Start by explaining the core identity and purpose of "${repoName}". Deduce the domain from README or folder structure (e.g., structure.topLevelDirs).
- Discuss the specific problem it solves, interpreting folder names based on the tech stack (e.g., logic in "/services" vs "/components").
- Identify the target audience and how the project serves them.
- Describe the "Tech Synergy": how the tools (like ${frameworks.join(", ") || "the stack"}) interact to achieve the project's goals.
- Detail the architecture based on folder nesting (e.g., "${hasAppsDir ? "explain the monorepo packages relationship" : "explain the layer/feature organization"}") and mention specific structural patterns observed.
- Highlight unique differentiators or high-quality implementations found in the code samples.

TONE: Senior Software Engineer, analytical, objective, and insightful.
`.trim();


    const antiHallucinationPolicy = `
ANTI-HALLUCINATION RULES:
- ABSENCE OF EVIDENCE IS NOT EVIDENCE OF ABSENCE: If you do not see a specific feature (like Auth, Database, or Tests) in the provided folders on directory structure (structure.topLevelDirs, structure.secondLevelDirs, etc.) or code samples, DO NOT assume it is missing.
- DO NOT invent suggestiones based on what you "think" might be missing. 
- ONLY criticize something if you see POOR implementation in the provided code, or if the Project Purpose clearly requires it and there is zero trace of it in the directory structure.
- If you are unsure if a feature exists, DO NOT mention it as a suggestion.
`.trim();


    return `
        You are a senior software engineer with 10+ years of experience in software development.
        You are analyzing a codebase and providing feedback on its architecture, strengths and suggestions for improvement.
        
        ${languageInstruction}

        ${initialInstructions}

        ${structureAnalysisPolicy}

        ${JSON.stringify(inputLite, null, 2)}
        ${antiHallucinationPolicy}

        ${summaryInstructions}

        ${heuristicAnalysisPolicy}

        ${input.readme ? `## PROJECT README: ${input.readme}` : "No README provided"}
        ${input.readme ? readmePolicy + " " + documentationPolicy : ""}
        ${input.codeSamples?.length
            ? `## Code Samples (evidence)\n${input.codeSamples
                .map(
                    (s: any) => `File: ${s.relativePath} (${s.language})\n` + `\`\`\`\n${s.excerpt}\n\`\`\``
                )
                .join("\n\n")}\n`
            : `## Code Samples (evidence)\n<missing>\n`
        }
        ${contextInferencePolicy}
        ${adaptationPolicy}
        ${blockList}
        ${strengthRigorPolicy}
        ${suggestionValidationPolicy}

        FINAL INSTRUCTION:
        Return a JSON object that strictly follows this schema structure:
        ${JSON.stringify(schema, null, 2)}

        Ensure the output is ONLY the JSON object, with no preamble or explanation.


    `.trim()

}