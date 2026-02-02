export function projectOverviewPrompt(input: any, locale: string = "en") {
  const isPt = locale?.toLowerCase().startsWith("pt");

  // Output text language (values), but JSON keys remain ENGLISH.
  const outputLanguage = isPt ? "Portuguese (pt-BR)" : "English";

  const languageInstruction = `
IMPORTANT:
- Output MUST be valid JSON.
- JSON object keys MUST be in English exactly as in the schema.
- ALL string VALUES (except enum fields) MUST be written in ${outputLanguage}.
- Do NOT translate keys. Do NOT add extra keys.
`.trim();

  const c = input.classification ?? {};

  // Keep schema keys in ENGLISH
  const schema = {
    schema_version: "2.1",
    language: isPt ? "pt-BR" : "en",
    meta: {
      primaryLanguage: input?.summary?.primaryLanguage ?? "Unknown",
      appType: input?.summary?.appType ?? "Unknown",
      domain: c?.domain ?? "unknown",
      purpose: c?.purpose ?? "unknown",
      maturityExpectation: c?.maturityExpectation ?? "low",
    },
    general_summary: {
      title: "",
      description: "",
    },
    architecture: {
      style:
        "monolith|modular_monolith|microservices|library|cli_tool|mobile_app|static_site|unknown",
      explanation: "",
      evidence: [
        {
          signal: "",
          source: "structure|infra|stack|codeSamples|readme",
        },
      ],
    },
    strengths: [
      {
        title: "",
        explanation: "",
        related_to: "domain|purpose|architecture|stack",
      },
    ],
    weaknesses: [
      {
        title: "",
        explanation: "",
        impact: "low" as "low" | "medium" | "high",
        context: "domain|purpose|maturity|security|performance|ux",
      },
    ],
    suggestions: [
      {
        title: "",
        recommended_action: "",
        rationale: "",
        priority: "low" as "low" | "medium" | "high",
      },
    ],
  };

  // Helps the LLM not over-trust README and to cross-check with heuristics
  const readmePolicy = `
README POLICY:
- Treat the README as "project claims" and "intended purpose", not as ground truth.
- Cross-check README claims against repository signals (structure, stack, infra, stats, and code samples).
- If README says something that is not supported by evidence in the repo context, explicitly mention the mismatch.
- If README is missing or too thin, infer purpose/domain from code and structure, and say that the purpose is inferred.
`.trim();

  // Encourage adaptive focus based on domain/purpose, without changing keys
  const adaptationPolicy = `
ADAPTATION POLICY:
- Vary emphasis based on meta.domain and meta.purpose:
  - If purpose is "learning" or "portfolio": prioritize clarity, architecture explanation, developer experience, and educational value.
  - If purpose is "production": prioritize reliability, security, scalability, observability, data integrity, and operational concerns.
  - If domain is "web": discuss routing, auth/session, API boundaries, caching, SEO (if relevant), performance, and deployment ergonomics.
  - If domain is "cli" or "systems": discuss UX in terminal, input validation, error handling, portability, performance, and packaging.
- Avoid repeating the same generic suggestions across projects. Suggestions must be specific to this repo context.
`.trim();

  const architecturePolicy = `ARCHITECTURE POLICY:
- You MUST infer architecture ONLY from evidence in Repository Context and Code Samples.
- If evidence is insufficient, set architecture.style = "unknown" and explain uncertainty in evidence + key_runtime_concerns.
- Never claim "microservices" just because it's a monorepo. A monorepo can still be a monolith/modular monolith.
- Treat "infra" signals as higher confidence than README claims.
- Provide at least 3 evidence items when style != "unknown".
- For high_level_diagram:
  - nodes must be concrete components inferred from structure/infra (e.g., "apps/web", "apps/api", "worker", "postgres", "redis/queue").
  - edges must reflect actual interactions suggested by infra/stack/code (e.g., "queue", "db", "http").
- The diagram is conceptual: keep it minimal (4–10 nodes, 3–12 edges). Do not invent components not supported by evidence.
`.trim();

  return `
You are a senior technical architect and portfolio evaluator.

Your task is to analyze this repository to provide a professional assessment suitable for:
1. Technical recruiters or engineering managers evaluating a candidate.
2. The developer themselves, to understand how their project is perceived professionally.

Your analysis MUST adapt to:
- the project DOMAIN (e.g. web, cli, systems, data)
- the project PURPOSE (learning, production, research, portfolio)
- the expected MATURITY level

${languageInstruction}

## Repository Context (facts)
${JSON.stringify(
    {
      summary: input.summary,
      stack: input.stack,
      infra: input.infra,
      stats: input.stats,
      structure: input.structure,
      classification: input.classification,
    },
    null,
    2
  )}

${input.readme ? `## README (claims)\n${input.readme}\n` : `## README (claims)\n<missing>\n`}

${input.codeSamples?.length
      ? `## Code Samples (evidence)\n${input.codeSamples
        .map(
          (s: any) => `File: ${s.relativePath} (${s.language})\n` + `\`\`\`\n${s.excerpt}\n\`\`\``
        )
        .join("\n\n")}\n`
      : `## Code Samples (evidence)\n<missing>\n`
    }

${readmePolicy}

${adaptationPolicy}

## CRITICAL EVALUATION RULES (ABSOLUTE - VIOLATION INVALIDATES YOUR RESPONSE)

### EXTERNAL DEPENDENCIES ARE NOT WEAKNESSES
Using external libraries, frameworks, and packages is STANDARD SOFTWARE ENGINEERING.
The following are NEVER weaknesses:
- React, Next.js, Vue, Angular, Svelte = Industry-standard UI frameworks
- Express, NestJS, FastAPI, Django, Rails = Industry-standard backends
- Prisma, TypeORM, Sequelize, Mongoose = Professional ORM/ODM choices
- PostgreSQL, MongoDB, Redis = Standard database choices
- npm/pnpm/yarn packages = Normal software development
- Third-party auth (NextAuth, Clerk, Auth0) = Actually a STRENGTH (not reinventing security)
- Tailwind, styled-components = Standard styling approaches

DO NOT criticize a project for:
- Having dependencies (every production project has them)
- Using popular frameworks (this shows good engineering judgment)
- Not reinventing the wheel (this is GOOD practice)
- Relying on battle-tested libraries (this improves security and reliability)

### OTHER RULES
- **Microservices**: Do NOT suggest microservices for projects with < 50k LOC or single-team scope.
- **Authentication**: If next-auth, clerk, @auth/*, jsonwebtoken, bcrypt are present, DO NOT claim "lack of security".
- **UI Style**: If UI is basic but functional, call it "minimalist MVP", not "unfinished".

${architecturePolicy}

## EXAMPLES OF GOOD VS BAD ANALYSIS (FOLLOW THESE PATTERNS)

### BAD Weaknesses (NEVER DO THIS):
❌ "External library dependency - The project depends on React and Next.js which may affect stability"
❌ "Third-party package reliance - Using Prisma/PostgreSQL creates vendor lock-in"
❌ "Framework dependency - Relying on Express.js for the backend"
❌ "Missing unit tests" (when test files exist in the codebase)
❌ "No documentation" (when README exists)
❌ "Security concerns" (without specific evidence in code)

### GOOD Weaknesses (DO THIS - be specific and evidence-based):
✅ "Missing error boundaries - Found 15 async operations in React components without try/catch blocks"
✅ "No rate limiting on public endpoints - /api/public/* routes lack request throttling"
✅ "Database queries in React components - Found direct Prisma calls in 3 client components (should use server actions)"
✅ "Hardcoded configuration - API keys found in source code instead of environment variables"
✅ "No input validation - User forms submit directly without sanitization (found in ContactForm.tsx)"

## Analysis Rules (VERY IMPORTANT)

### General Summary
- Write 6–10 lines in general_summary.description.
- Explain WHAT the project is, WHO it is for, and WHAT problem it solves.
- Mention domain and purpose explicitly (based on evidence + README claims).
- Do NOT just list technologies.
- If you are inferring purpose/domain due to missing README or weak evidence, state that clearly.

### Architecture
- Fill architecture.style based on evidence:
  - "microservices": multiple independently deployable services with clear boundaries + infra hints (separate deploy configs, multiple service entrypoints, multiple DBs/queues per service, etc.)
  - "modular_monolith": single deployable backend but multiple modules/packages with clear boundaries
  - "monolith": single app/service with most concerns inside it
  - "cli_tool": main value delivered via terminal executable
  - "library": primarily reusable package consumed by others
  - "static_site": purely static content build
- Fill architecture.explanation with 4–8 lines explaining why this style fits THIS repo context.
- Do NOT mention "evidence lists" or refer to internal signals explicitly. Just explain it plainly.
- If style is "unknown", explain what info is missing to decide.
- Provide evidence items (signal + source). Mention mismatches with README claims.

### Strengths
- Return 3–5 Strengths.
- Each item MUST tie back to domain/purpose OR specific repo evidence (stack/structure/code samples).
- Avoid generic statements like "uses modern stack" - be specific about WHY the choices are good.

### Weaknesses
- Return 1–4 Weaknesses ONLY if they are REAL and SPECIFIC.
- It is BETTER to return 1-2 genuine weaknesses than 3+ fabricated ones.
- If the project is well-structured and you cannot find real issues, return fewer weaknesses.
- Each weakness MUST:
  - Reference specific files, patterns, or evidence from the repository
  - Explain why it matters for THIS domain/purpose/maturity
  - Be actionable (the developer can actually fix it)
- Do NOT include generic advice (tests/CI/docs) unless specifically missing AND critical for this project type.

### Suggestions
- Return 2–5 suggestions.
- Must be realistic for the maturityExpectation.
- Must be specific to the detected stack and architecture.
- Each suggestion must include a clear action and rationale.
- Avoid enterprise-level suggestions for learning projects.
- Avoid trivial suggestions for production projects.

## Output Contract
- Return ONLY valid JSON (no markdown, no extra keys).
- Keys MUST match the schema exactly (English keys only).
- String VALUES must be in ${outputLanguage}.
- Be precise, concrete, and contextual.
- If something is uncertain, state uncertainty instead of guessing.

Schema:
${JSON.stringify(schema, null, 2)}
`.trim();
}
