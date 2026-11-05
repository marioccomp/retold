import Groq from "groq-sdk";

import {
  LlmCompletion,
  LlmCompletionRequest,
  LlmProvider,
  LlmRateLimitError,
  parseDurationMs,
} from "./provider.js";

// llama-3.3-70b-versatile was removed from Groq (404 model_not_found, checked 2026-11-05).
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";

export function isGroqReasoningModel(model: string) {
  return /gpt-oss/i.test(model);
}

type GroqLikeError = {
  status?: number;
  message?: string;
  headers?: { get?: (name: string) => string | null } | Record<string, string>;
  error?: { error?: { code?: string; message?: string } };
};

function readHeader(headers: GroqLikeError["headers"], name: string): string | null {
  if (!headers) return null;
  if (typeof (headers as { get?: unknown }).get === "function") {
    return (headers as { get: (n: string) => string | null }).get(name);
  }
  return (headers as Record<string, string>)[name] ?? null;
}

/** Converts a Groq SDK error into LlmRateLimitError when it is a rate limit, else null. */
export function toGroqRateLimitError(error: unknown): LlmRateLimitError | null {
  const err = (error ?? {}) as GroqLikeError;
  const message = err.error?.error?.message ?? err.message ?? "";
  const isRateLimit =
    err.status === 429 ||
    err.error?.error?.code === "rate_limit_exceeded" ||
    /rate limit/i.test(message);

  if (!isRateLimit) return null;

  // "Request too large ... tokens per minute (TPM): Limit 8000, Requested 9314":
  // the request alone exceeds the per-minute budget, so waiting never helps.
  // Treating it as a rate limit would reschedule the analysis forever.
  if (/request too large/i.test(message)) return null;

  const retryAfterHeader = readHeader(err.headers, "retry-after");
  const retryAfterSeconds = retryAfterHeader ? Number.parseFloat(retryAfterHeader) : NaN;
  const retryAfterMs = Number.isFinite(retryAfterSeconds)
    ? Math.ceil(retryAfterSeconds * 1000)
    : parseDurationMs(message);

  // Keep the provider message (it says which limit was hit: RPM, TPM, TPD, request size).
  return new LlmRateLimitError(`Groq rate limit exceeded: ${message.slice(0, 300)}`, retryAfterMs);
}

export class GroqProvider implements LlmProvider {
  readonly name = "groq";
  readonly model: string;
  private readonly client: Groq;

  constructor(options: { apiKey?: string; model?: string } = {}) {
    this.model = options.model ?? GROQ_DEFAULT_MODEL;
    this.client = new Groq({ apiKey: options.apiKey ?? process.env.GROQ_API_KEY });
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletion> {
    // Only reasoning models accept these; others reject the request.
    const reasoning =
      request.reasoningEffort && isGroqReasoningModel(this.model)
        ? { reasoning_effort: request.reasoningEffort, include_reasoning: false }
        : {};

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: request.messages,
        temperature: request.temperature,
        max_completion_tokens: request.maxOutputTokens,
        ...reasoning,
        ...(request.json ? { response_format: { type: "json_object" as const } } : {}),
      });

      return {
        text: completion.choices[0]?.message?.content ?? "",
        model: completion.model ?? this.model,
        usage: completion.usage
          ? {
              inputTokens: completion.usage.prompt_tokens ?? 0,
              outputTokens: completion.usage.completion_tokens ?? 0,
            }
          : null,
      };
    } catch (error) {
      throw toGroqRateLimitError(error) ?? error;
    }
  }
}
