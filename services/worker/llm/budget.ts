/**
 * Token budget for the two-stage analysis.
 *
 * Free tiers limit tokens per minute (Groq's gpt-oss-120b: 8K TPM, and the
 * requested max_completion_tokens counts too). Instead of letting a request
 * fail, BudgetedProvider waits until the last minute's spending leaves room for
 * it, retries short rate-limit waits in place, and adds up what the run used.
 */
import {
  LlmCompletion,
  LlmCompletionRequest,
  LlmProvider,
  LlmRateLimitError,
  LlmUsage,
} from "./provider.js";

export type LlmBudget = {
  /** Provider limit per rolling minute (input + max output); null = no limit. */
  tokensPerMinute: number | null;
  /** Input budget of one call: prompt + repository content. */
  maxInputTokensPerCall: number;
  maxOutputTokensMap: number;
  maxOutputTokensReduce: number;
  /** Second-look check of claims (0 disables it). */
  maxOutputTokensCheck: number;
  /** Map calls per analysis (each covers one unit of the repository). */
  maxMapCalls: number;
};

function readPositiveInt(env: NodeJS.ProcessEnv, name: string, fallback: number) {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/**
 * Defaults fit Groq's free tier for gpt-oss-120b (8K tokens/min). With a paid
 * model, raise them, e.g. LLM_TOKENS_PER_MINUTE=0 (no limit) and
 * LLM_MAX_INPUT_TOKENS_PER_CALL=60000.
 */
export function readLlmBudget(env: NodeJS.ProcessEnv = process.env): LlmBudget {
  const tokensPerMinute = readPositiveInt(env, "LLM_TOKENS_PER_MINUTE", 8000);
  return {
    tokensPerMinute: tokensPerMinute === 0 ? null : tokensPerMinute,
    maxInputTokensPerCall: readPositiveInt(env, "LLM_MAX_INPUT_TOKENS_PER_CALL", 4500),
    maxOutputTokensMap: readPositiveInt(env, "LLM_MAX_OUTPUT_TOKENS_MAP", 2000),
    maxOutputTokensReduce: readPositiveInt(env, "LLM_MAX_OUTPUT_TOKENS_REDUCE", 3000),
    maxOutputTokensCheck: readPositiveInt(env, "LLM_MAX_OUTPUT_TOKENS_CHECK", 1200),
    maxMapCalls: readPositiveInt(env, "LLM_MAX_MAP_CALLS", 3),
  };
}

/**
 * Conservative estimate (~3.5 characters per token for code and English).
 * Overestimating only costs some waiting; underestimating gets requests refused.
 */
export function estimateTokens(text: string) {
  return Math.ceil(text.length / 3.5);
}

export function estimateRequestTokens(request: LlmCompletionRequest) {
  // A few tokens of chat framing per message.
  return request.messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0);
}

export type LlmCallRecord = {
  label: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  waitedMs: number;
};

type Clock = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
};

const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

const WINDOW_MS = 60_000;

export class BudgetedProvider implements LlmProvider {
  readonly name: string;
  readonly model: string;
  readonly usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };
  readonly calls: LlmCallRecord[] = [];

  private readonly window: { at: number; tokens: number }[] = [];

  constructor(
    private readonly inner: LlmProvider,
    private readonly options: {
      tokensPerMinute: number | null;
      /** Rate-limit waits up to this long are retried in place. */
      maxInPlaceWaitMs?: number;
      maxRetries?: number;
      clock?: Clock;
    }
  ) {
    this.name = inner.name;
    this.model = inner.model;
  }

  private get clock() {
    return this.options.clock ?? realClock;
  }

  private spentInWindow(now: number) {
    while (this.window.length > 0 && this.window[0].at <= now - WINDOW_MS) this.window.shift();
    return this.window.reduce((sum, entry) => sum + entry.tokens, 0);
  }

  /** Waits until the rolling minute has room for `tokens`; returns how long it waited. */
  private async waitForCapacity(tokens: number) {
    const limit = this.options.tokensPerMinute;
    if (limit === null) return 0;

    let waited = 0;
    for (;;) {
      const now = this.clock.now();
      if (this.spentInWindow(now) + tokens <= limit || this.window.length === 0) return waited;
      const waitMs = Math.max(250, this.window[0].at + WINDOW_MS - now + 50);
      await this.clock.sleep(waitMs);
      waited += waitMs;
    }
  }

  async complete(request: LlmCompletionRequest, label = "call"): Promise<LlmCompletion> {
    const reserved = estimateRequestTokens(request) + (request.maxOutputTokens ?? 1024);
    const limit = this.options.tokensPerMinute;
    if (limit !== null && reserved > limit) {
      // A caller bug: the request can never fit. Fail loudly instead of looping.
      throw new Error(`LLM request needs ~${reserved} tokens, above the ${limit} tokens/min budget`);
    }

    const maxRetries = this.options.maxRetries ?? 3;
    const maxInPlaceWaitMs = this.options.maxInPlaceWaitMs ?? 90_000;
    let waitedMs = 0;

    for (let attempt = 0; ; attempt++) {
      waitedMs += await this.waitForCapacity(reserved);
      const startedAt = this.clock.now();
      this.window.push({ at: startedAt, tokens: reserved });

      try {
        const completion = await this.inner.complete(request);
        const usage = completion.usage ?? { inputTokens: 0, outputTokens: 0 };
        this.usage.inputTokens += usage.inputTokens;
        this.usage.outputTokens += usage.outputTokens;
        this.calls.push({
          label,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          durationMs: this.clock.now() - startedAt,
          waitedMs,
        });
        return completion;
      } catch (error) {
        const shortWait =
          error instanceof LlmRateLimitError &&
          error.retryAfterMs !== null &&
          error.retryAfterMs <= maxInPlaceWaitMs &&
          attempt < maxRetries;
        if (!shortWait) throw error;

        const waitMs = Math.max(error.retryAfterMs ?? 0, 1000);
        await this.clock.sleep(waitMs);
        waitedMs += waitMs;
      }
    }
  }
}
