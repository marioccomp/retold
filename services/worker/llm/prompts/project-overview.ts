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
  readme?: string;
}) {
  return `You are an elite Software Architecture Consultant. Your task is to provide a high-level, professional executive summary of a software project based on repository metadata and its README.

## Contextual Data
The following metadata has been extracted from the repository:

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

## Instructions
1.  **Analyze** the combination of frameworks, tools, and project structure.
2.  **Synthesize** the project's purpose, architectural patterns, and overall quality.
3.  **Strictly adhere** to the output format below. Use clean, professional Markdown without any emojis.
4.  **Tone:** Professional, objective, and insightful (Senior Architect level).

## Output Format Specification
Generate your response using the following structure:

# Project Executive Summary

### Overview
[Clear and concise 2-3 sentence description of the project's nature, core functionality, and value proposition.]

---

### Architectural Blueprint
**System Style:** [e.g. Modern Web Monolith / Distributed Microservices / Event-Driven Architecture / etc.]

**Analysis:**
[Explain the architectural choices. How do the frameworks interact? Is it a standard pattern (like Hexagonal, MVC, or Layered)? Detail the data flow and component relationships based on the file structure.]

---

### Core Strengths
- **[Strength Title]:** [Detailed explanation of a technical or organizational strength.]
- **[Strength Title]:** [Detailed explanation of a technical or organizational strength.]
- **[Strength Title]:** [Detailed explanation of a technical or organizational strength.]

---

### Strategic Recommendations
- **[Recommendation Title]:** [Actionable advice for technical debt, scalability, or best practices.]
- **[Recommendation Title]:** [Actionable advice for technical debt, scalability, or best practices.]

---

### Maturity & Production Readiness
**Current Status:** [Prototype | Small-scale MVP | Mature Application | Enterprise Ready]

**Justification:**
[A professional assessment of why the project sits at this level, considering the presence of tests, infrastructure, and stack choices.]
`;
}
