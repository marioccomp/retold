export function projectOverviewPrompt(input: {
  summary: {
    primaryLanguage: string;
    appType: string;
  };
  stack: {
    languages: string[];
    frameworks: string[];
    tools: string[];
  };
  infra: {
    hasCI: boolean;
    hasDocker: boolean;
    hasKubernetes: boolean;
    hasTerraform: boolean;
    hasLint: boolean;
    hasTests: boolean;
  };
  stats: {
    totalFiles: number;
    sourceFiles: number;
    testFiles: number;
    configFiles: number;
    docsFiles: number;
  };
  structure: any;
  classification?: {
    domain: string;
    purpose: string;
    languageFamily: string;
    maturityExpectation: string;
    signals: string[];
  };
  readme?: string;
  codeSamples?: {
    relativePath: string;
    language: string;
    excerpt: string;
    reason: string;
  }[];
}, locale: string = "en") {
  const languageInstruction =
    locale === "pt"
      ? "IMPORTANT: The user speaks Portuguese. You MUST generate the entire response in Portuguese (pt-BR). Even the headers."
      : "IMPORTANT: The user speaks English. You MUST generate the entire response in English.";

  const { classification, codeSamples } = input;
  const isLearning = classification?.purpose === "learning" || classification?.purpose === "research" || classification?.maturityExpectation === "low";
  const isSystems = classification?.domain === "systems" || classification?.languageFamily === "compiled";
  const isData = classification?.domain === "data" || classification?.languageFamily === "scientific";

  let specificGuidelines = "";

  if (isLearning) {
    specificGuidelines += `
  - **Academic / Learning Context Detected:**
    - DO NOT require CI/CD, Docker, or advanced observability unless explicitly present.
    - Focus on code structure, algorithmic correctness, clarity, and basic documentation.
    - Mention testing or linting only as "educational next steps", not critical failures.
    - Respect the simpler nature of the project.
  `;
  }

  if (isSystems) {
    specificGuidelines += `
  - **Systems/Low-Level Context Detected:**
    - Focus on memory safety, proper use of headers/modules, build systems (Make/CMake/Cargo).
    - Avoid web-centric checklists (no need for K8s, Vercel, etc. unless applicable).
  `;
  }

  if (isData) {
    specificGuidelines += `
  - **Data/Scientific Context Detected:**
    - Focus on reproducibility (seeds, environments), clean notebooks, and data flow.
  `;
  }

  if (codeSamples && codeSamples.length > 0) {
    specificGuidelines += `
  - **Code Context Available:**
    - Use the provided code excerpts to understand the coding style and actual logic.
    - If README is missing, rely on these samples to infer the project's purpose.
    - DO NOT hallucinate frameworks that are not evident in the code or stack.
      `;
  }

  return `You are an elite Software Architecture Consultant. Your task is to provide a high-level, professional executive summary of a software project based on repository metadata and its README.
  
  ## Contextual Data
  The following metadata has been extracted from the repository:
  
  ### Project Classification (Heuristic)
  - **Domain:** ${classification?.domain ?? "Unknown"}
  - **Purpose:** ${classification?.purpose ?? "Unknown"}
  - **Maturity Expectation:** ${classification?.maturityExpectation ?? "Unknown"}
  - **Signals:** ${classification?.signals?.join(", ") ?? "None"}
  
  ### Technical Stack & Summary
  - **Primary Language:** ${input.summary.primaryLanguage}
  - **Application Type:** ${input.summary.appType}
  - **Frameworks:** ${input.stack.frameworks.join(", ") || "None detected"}
  - **Tools & Libraries:** ${input.stack.tools.join(", ") || "None detected"}
  
  ### Infrastructure & Quality Signals
  - **CI/CD Configured:** ${input.infra.hasCI ? "Yes" : "No"}
  - **Testing Suite Detected:** ${input.infra.hasTests ? "Yes" : "No"}
  - **Linting/Code Quality:** ${input.infra.hasLint ? "Yes" : "No"}
  - **Containerization (Docker):** ${input.infra.hasDocker ? "Yes" : "No"}
  - **Infrastructure as Code:** ${input.infra.hasKubernetes || input.infra.hasTerraform ? "Yes" : "No"}
  
  ### Project Scale & Composition
  - **Total Files:** ${input.stats.totalFiles}
  - **Source Files:** ${input.stats.sourceFiles}
  - **Test Files:** ${input.stats.testFiles}
  - **Configuration Files:** ${input.stats.configFiles}
  - **Documentation Files:** ${input.stats.docsFiles}
  
  ### Directory Structure
  \`\`\`
  ${JSON.stringify(input.structure, null, 2)}
  \`\`\`
  
  ${input.readme ? `### README.md Snippet\n${input.readme}` : ""}

  ${codeSamples && codeSamples.length > 0 ? `### Representative Code Samples
  ${codeSamples.map(s => `#### ${s.relativePath} (${s.language})\n\`\`\`${s.language.toLowerCase()}\n${s.excerpt}\n\`\`\``).join("\n\n")}
  ` : ""}
  
  ## Instructions
  1.  **Analyze** the combination of frameworks, tools, and project structure, CONSIDERING THE CLASSIFICATION above.
  2.  **Synthesize** the project's purpose, architectural patterns, and overall quality.
  3.  **Strictly adhere** to the output format below. Use clean, professional Markdown without any emojis.
  4.  **Tone:** Professional, objective, and insightful (Senior Architect level).
  5.  ${languageInstruction}
  
  ### Special Guidelines based on Classification
  ${specificGuidelines}
  
  ## Output Format Specification
  Generate your response using the following structure:
  
  # Project Executive Summary
  
  ### Overview
  [Clear and concise 2-3 sentence description of the project's nature, core functionality, and value proposition. Mention if it appears to be a learning exercise or research project.]
  
  ---
  
  ### Architectural Blueprint
  **System Style:** [e.g. Modern Web Monolith / Distributed Microservices / CLI Tool / Academic Implementation]
  
  **Analysis:**
  [Explain the architectural choices. How do the frameworks interact? Is it a standard pattern (like Hexagonal, MVC, or Layered)? Detail the data flow and component relationships based on the file structure.]
  
  ---
  
  ### Core Strengths
  - **[Strength Title]:** [Detailed explanation of a technical or organizational strength.]
  - **[Strength Title]:** [Detailed explanation of a technical or organizational strength.]
  - **[Strength Title]:** [Detailed explanation of a technical or organizational strength.]
  
  ---
  
  ### Strategic Recommendations
  - **[Recommendation Title]:** [Actionable advice. IF LEARNING: Suggest clean code, simpler improvements. IF PRODUCTION: Suggest CI/CD, scale.]
  - **[Recommendation Title]:** [Actionable advice.]
  
  ---
  
  ### Maturity & Production Readiness
  **Current Status:** [${isLearning ? "Prototype / Educational / Research" : "Prototype | Small-scale MVP | Mature Application | Enterprise Ready"}]
  
  **Justification:**
  [A professional assessment of why the project sits at this level, considering the presence of tests, infrastructure, and stack choices.]
  `;
}
