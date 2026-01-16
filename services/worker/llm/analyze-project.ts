import { groq } from "./groq-client.js";
import { projectOverviewPrompt } from "./prompts/project-overview.js";

export async function analyzeProjectWithLLM(analysis: {
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
  const prompt = projectOverviewPrompt(analysis);

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are an elite Software Architecture Consultant. Analyze the provided repository metadata strictly and objectively.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
  });

  return completion.choices[0].message.content;
}
