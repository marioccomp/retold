import { Heuristic } from "../../types/heuristic";

export function projectPrompt(input: Heuristic, repoName: string) {
    const isPt = input.locale?.toLowerCase().startsWith("pt");

    const outputLanguage = isPt ? "pt-BR" : "en";

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

    const topLevelDirs = input.structure.topLevelDirs;
    const secondLevelDirs = input.structure.secondLevelDirs;
    const hasAppsDir = input.structure.hasAppsDir;
    const hasPackagesDir = input.structure.hasPackagesDir;

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
            description: "",
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
        weaknesses: [
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

    const heuristicAnalysisPolicy = `
        - You MUST analyze how these frameworks ${frameworks.join(", ") + " " + primaryLanguage + " " + appType !== "unknown" ? appType : ""} interact with each other on the project.
        - You MUST understand how the combination of frameworks impacts the project.
        - You MUST understand and explain how the combination of frameworks interact with each other.
        - You MUST say about all the infra stuff: ${input.infra} and how it impacts the project (Says about all present).
        - You MUST understand if ${input.infra.ciProviders.length > 0 ? "then the project has CI/CD configured" : "then the project has not CI/CD configured"}.
        - You MUST understand if ${input.infra.hasTests ? "then the project has tests" : "then the project has no tests"}.
        - You MUST understand if ${input.infra.hasKubernetes ? "then the project has Kubernetes" : "then the project has no Kubernetes"}.
        - You MUST understand if ${input.infra.hasTerraform ? "then the project has Terraform" : "then the project has no Terraform"}.
        - You MUST understand if ${input.infra.hasDockerfile ? "then the project has Dockerfile" : "then the project has no Dockerfile"}.
        - You MUST understand if ${input.infra.hasCompose ? "then the project has Docker Compose" : "then the project has no Docker Compose"}.
        - You MUST understand if ${input.infra.lintTools.length > 0 ? "then the project has lint tools" : "then the project has no lint tools"}.
        - You MUST understand if ${input.infra.testTools.length > 0 ? "then the project has test tools" : "then the project has no test tools"}.
        - You must correlate all these things and explain how they impact the project.
    `

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
        - Valid documentation weakness: "API endpoint documentation missing for /api/v1/* routes"
        - INVALID weakness: "Improve documentation" (when README already covers install/usage/config)
        - If README contains detailed setup instructions, this is a STRENGTH, not something to improve.
        `.trim();

    const stackSinergyPolicy = `
        - You MUST analyze how these tools ${tools.join(", ") + " " + primaryLanguage + " " + appType !== "unknown" ? appType : ""} interact with each other on the project.
        - You MUST understand how the combination of tools impacts the project.
        - You MUST understand and explain how the combination of tools interact with each other.
    `


    const weaknessValidationPolicy = `
WEAKNESS VALIDATION (CHECK BEFORE CRITICIZING):
- MANDATORY pre-checks:
  - ${input.infra.hasTests ? "Do NOT criticize 'lack of tests' and do NOT recommend add tests, only if there are few tests, and you have to explicity say why to add more tests" : "You can criticize 'lack of tests'"}
  - ${input.readme ? "Do NOT criticize 'lack of documentation'" : "You can criticize 'lack of documentation'"}
  - ${input.infra.ciProviders.length > 0 ? "Do NOT criticize 'missing CI/CD'" : "You can criticize 'missing CI/CD'"}
  - ${input.infra.lintTools.length > 0 ? "Do NOT criticize 'no linting/code quality'" : "You can criticize 'no linting/code quality'"}
  - ${input.infra.testTools.length > 0 ? "Do NOT criticize 'no test tools' and do NOT recommend any other test tool" : "You can criticize 'no test tools'"}
  - ${input.stack.tools.includes("orm") ? "Do NOT criticize 'raw SQL' or 'no data layer'" : "You can criticize 'raw SQL' or 'no data layer'"}
  - ${input.stack.tools.includes("auth") ? "Do NOT criticize 'no authentication'" : "You can criticize 'no authentication' if you have more evidences, this is not enough"}
- Each weakness MUST have:
  - Specific file, pattern, or code sample as evidence
  - Explanation of why it matters for THIS project's domain/purpose
  - Actionable fix (what specifically to do)
- Maximum 4 weaknesses - quality over quantity
- If project is well-structured: return 1-2 genuine issues, or acknowledge it's solid.
`.trim();

    const adaptationPolicy = `
ADAPTATION POLICY:
- Vary emphasis based on meta.domain and meta.purpose:
  - ${purpose === "learning" ? "prioritize clarity, architecture explanation, developer experience, and educational value." : ""}
  - ${purpose === "production" ? "prioritize reliability, security, scalability, observability, data integrity, and operational concerns." : ""}
  - ${domain === "web" ? "discuss routing, auth/session, API boundaries, caching, SEO (if relevant), performance, and deployment ergonomics." : ""}
  - ${domain === "cli" || domain === "systems" ? "discuss UX in terminal, input validation, error handling, portability, performance, and packaging." : ""}

SUGGESTION DIVERSITY (CRITICAL - AVOID GENERIC SUGGESTIONS):
- NEVER default to "add tests" or "improve documentation" - these are the MOST COMMON and LEAST USEFUL suggestions.
- Instead, think about UNIQUE aspects of THIS project and suggest improvements in these categories:
  ARCHITECTURE:
    - "Consider extracting X into a separate service/package"
    - "The coupling between A and B could be reduced using dependency injection"
    - "Consider implementing a repository pattern for data access"
  PERFORMANCE:
    - "Add caching for API route X that fetches frequently accessed data"
    - "Consider lazy loading for the heavy component Y"
    - "Implement pagination for the list endpoint Z"
  DEVELOPER EXPERIENCE:
    - "Add a formatter for the project"
    - "Add a linter for the project"
    - "Add path aliases to simplify imports"
  SECURITY:
    - "Consider rate limiting on the auth endpoints"
    - "Add input validation with Zod for API routes"
    - "Implement CORS configuration for production"
  OBSERVABILITY:
    - "Add structured logging for debugging"
    - "Consider adding error tracking (Sentry, etc.)"
    - "Add health check endpoints"
- If the project is WELL-STRUCTURED and has good practices: acknowledge it and suggest ADVANCED improvements, not basics.
- If you cannot think of a non-generic suggestion, return an EMPTY suggestions array.
`.trim();

    const blockList = `
        - "Do not make a strength about the project using new technologies"
        - "Do not make a suggestion about the project using new technologies"
        - "Do not make a weakness about the project using new technologies"
    `

    const contextInferencePolicy = `
CONTEXT INFERENCE POLICY:
- If README is missing:
    1. Use the repository name "${repoName}" as a PRIMARY HYPOTHESIS.
    2. Look for evidence in code samples (e.g., Models named "Product", controllers named "Cart") that support this hypothesis.
    3. If evidence is found, state: "Based on the repository name and code patterns, this project appears to be..."
    4. If NO evidence is found in the code, state: "The repository name suggests an '${repoName}' project, but the current code structure is generic or early-stage."
- Do NOT treat the repo name as absolute truth if the code shows something completely different.
- ALWAYS maintain a tone of professional technical deduction.
`.trim();

    const structureAnalysisPolicy = `
FOLDER ORGANIZATION & COHESION POLICY:
- Analyze the following directory structure:
  - Top Level: ${topLevelDirs.join(", ")}
  - Second Level: ${secondLevelDirs.join(", ")}
- PRIMARY GOAL: Evaluate if the folder organization is cohesive and facilitates finding code.
- ARCHITECTURE CAP: Do NOT try to label the architecture (e.g., "Clean Architecture", "Hexagonal") unless the folder names and code samples make it explicitly undeniable. 
- If the architecture is generic or standard for the framework (e.g., standard Next.js or NestJS structure), treat it as "Framework idiomatic" rather than a specific architectural pattern.
- Only mention architecture if you notice "Emergent Patterns" (patterns that are being formed but perhaps not fully realized) or clear inconsistencies that affect maintenance.
`.trim();

    const summaryInstructions = `
        You MUST write EXACTLY 10-15 lines in summary field. This is MANDATORY. 
        Follow the following structure:
            1. What is the project: Explicitly state what the project is. If you are inferring from the name "${repoName}", use cautious language like "appears to be", "likely serves as", or "suggests a domain of".
            2. PROBLEM it solves: Deduce from README or correlate the Tech Stack with the Repo Name.
                - If evidence is thin, use speculative language (e.g., "likely addresses", "potentially solves", "appears to target").
                - Connect the dots: If it's a ${primaryLanguage} project with ${frameworks.join(", ")}, mention what types of problems this specific stack is usually chosen for in the context of "${repoName}", expliciting that it is a supposition.
            3. TARGET AUDIENCE
            4. TECHNOLOGY SYNERGY
            5. ARCHITECTURE OVERVIEW
        - Do NOT just list technologies - explain their PURPOSE and INTERACTION
        - If README is thin, infer from code samples and structure, stating that you are inferring.
        `


    const antiHallucinationPolicy = `
ANTI-HALLUCINATION RULES:
- ABSENCE OF EVIDENCE IS NOT EVIDENCE OF ABSENCE: If you do not see a specific feature (like Auth, Database, or Tests) in the provided folders or code samples, DO NOT assume it is missing.
- DO NOT invent weaknesses based on what you "think" might be missing. 
- ONLY criticize something if you see POOR implementation in the provided code, or if the Project Purpose clearly requires it and there is zero trace of it in the directory structure.
- If you are unsure if a feature exists, DO NOT mention it as a weakness.
`.trim();






    return `
        You are a senior software engineer with 10+ years of experience in software development.
        You are analyzing a codebase and providing feedback on its architecture, strengths, weaknesses, and suggestions for improvement.
        
        ${languageInstruction}

        ${initialInstructions}

        ${structureAnalysisPolicy}

        Heuristics data to guide your analysis:
        ${JSON.stringify(input, null, 2)}
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
        ${stackSinergyPolicy}
        ${summaryInstructions}
        ${antiHallucinationPolicy}
        ${weaknessValidationPolicy}
        ${blockList}
        ${schema}

        If you do not have enough information to generate what the project is, you can use the repo name: ${repoName} to help you to write.
        

        FINAL INSTRUCTION:
        Return a JSON object that strictly follows this schema structure:
        ${JSON.stringify(schema, null, 2)}

        Ensure the output is ONLY the JSON object, with no preamble or explanation.


    `.trim()

}