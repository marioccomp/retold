export function projectOverviewPrompt(input: {
  summary: any;
  stack: any;
  infra: any;
  stats: any;
  structure: any;
  readme?: string; // opcional
}) {
  return `
You are a senior software architect.

Analyze the following repository metadata and produce a technical overview.

Rules:
- Do NOT guess technologies not listed in the metadata.
- Base all reasoning strictly on the provided data.
- Consider each framework and tool listed, and explain how it influences the architecture, data flow, and application behavior.
- If a framework implies server-driven SPA (e.g., Inertia.js) or SSR (e.g., Next.js), reflect that accurately.
- Use any relevant information from the README.md to understand the purpose and structure of the project.
- Be concise but precise.
- Use bullet points.
- Provide JSON at the end summarizing each framework/tool impact, for example:
[
  {
    "framework": "Inertia.js",
    "impact": "server-driven SPA, avoids REST APIs",
    "notes": "Pages are rendered server-side, updates sent via XHR"
  }
]

Repository metadata:
${JSON.stringify(input, null, 2)}

${input.readme ? `---\nREADME.md content:\n${input.readme}` : ""}

Return:
1. High-level description of the system
2. Architectural style (monolith, layered, SPA + API, server-driven SPA, SSR, etc.)
3. Strengths
4. Weaknesses
5. Overall maturity level (prototype, MVP, production-ready)
6. Framework/tool impact summary (as JSON)
`;
}
