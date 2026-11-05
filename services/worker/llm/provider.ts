/**
 * Provider-agnostic LLM interface. The analysis pipeline only talks to this
 * interface, so switching model or vendor (e.g. to compare them in the eval set)
 * means adding one implementation and changing LLM_PROVIDER / LLM_MODEL.
 */

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmCompletionRequest = {
  messages: LlmMessage[];
  temperature?: number;
  /** Ask the provider to return a single JSON object, when supported. */
  json?: boolean;
  /** Upper bound for the answer. Reasoning models also spend it on reasoning. */
  maxOutputTokens?: number;
  /** For reasoning models: less effort spends fewer (rate-limited) tokens. */
  reasoningEffort?: "low" | "medium" | "high";
};

export type LlmUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type LlmCompletion = {
  text: string;
  model: string;
  usage: LlmUsage | null;
};

export interface LlmProvider {
  /** Vendor id, e.g. "groq". */
  readonly name: string;
  /** Model id sent to the vendor. */
  readonly model: string;
  complete(request: LlmCompletionRequest): Promise<LlmCompletion>;
}

/** The provider refused the request because of rate limits / quota. */
export class LlmRateLimitError extends Error {
  /** How long to wait before retrying, when the provider said so. */
  readonly retryAfterMs: number | null;

  constructor(message: string, retryAfterMs: number | null) {
    super(message);
    this.name = "LlmRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Parses durations such as "7m12.48s", "586ms", "1h2m" or "30s" (the format used
 * in "Please try again in ..." messages). Returns null when nothing matches.
 */
export function parseDurationMs(text: string): number | null {
  const match = text.match(/try again in\s+((?:\d+(?:\.\d+)?(?:ms|h|m|s))+)/i);
  const duration = match?.[1] ?? text.trim();

  // "ms" must be tried before "m" and "s", or "586ms" would read as 586 minutes.
  const parts = [...duration.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/gi)];
  if (parts.length === 0) return null;

  const unitMs: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000 };
  const total = parts.reduce(
    (sum, [, value, unit]) => sum + Number.parseFloat(value) * unitMs[unit.toLowerCase()],
    0
  );

  return Math.ceil(total);
}
