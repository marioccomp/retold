import { groq } from "./groq-client.js";
import { projectOverviewPrompt } from "./prompts/project-overview.js";

export async function analyzeProjectWithLLM(analysis: {
  summary: any;
  stack: any;
  infra: any;
  stats: any;
  structure: any;
  readme?: string;
}) {
  const prompt = projectOverviewPrompt({
    ...analysis,
    readme: analysis.readme ? `\n\n---\nREADME.md content:\n${analysis.readme}` : "",
  });

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "You are a helpful but critical software architect." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });

  return completion.choices[0].message.content;
}
