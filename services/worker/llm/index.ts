import path from "path";
import { config as loadDotenv } from "dotenv";

import { GroqProvider } from "./groq-provider.js";
import type { LlmProvider } from "./provider.js";

// Kept from the former groq-client.ts: the worker may be started without
// --env-file (e.g. by PM2), so load the monorepo root .env. Existing variables
// are never overridden.
loadDotenv({ path: path.resolve("../..", ".env") });

export * from "./provider.js";

/**
 * Builds the configured provider.
 *   LLM_PROVIDER  vendor id (default "groq")
 *   LLM_MODEL     model id override (default: the provider's default model)
 *
 * To add a vendor: implement LlmProvider in its own file and add a case here.
 */
export function createLlmProvider(env: NodeJS.ProcessEnv = process.env): LlmProvider {
  const providerName = (env.LLM_PROVIDER ?? "groq").trim().toLowerCase();
  const model = env.LLM_MODEL?.trim() || undefined;

  switch (providerName) {
    case "groq":
      return new GroqProvider({ model });
    default:
      throw new Error(`Unknown LLM_PROVIDER "${providerName}"`);
  }
}

let defaultProvider: LlmProvider | null = null;

/** Lazily created process-wide provider. */
export function getDefaultLlmProvider(): LlmProvider {
  defaultProvider ??= createLlmProvider();
  return defaultProvider;
}
