import { createLogger } from "@repo/observability";

import { BudgetedProvider } from "./budget.js";
import { LlmCompletionRequest, LlmProvider, LlmRateLimitError } from "./provider.js";

const logger = createLogger("worker.llm-analysis");

export class LlmAnalysisUnavailableError extends Error {
  code: "provider_request_failed" | "invalid_json";

  constructor(message: string, code: "provider_request_failed" | "invalid_json") {
    super(message);
    this.name = "LlmAnalysisUnavailableError";
    this.code = code;
  }
}

/**
 * Asks for a JSON answer and parses it with `parse` (null = unusable).
 * Two attempts: JSON mode first; then a stricter reminder without JSON mode
 * (some providers reject the whole request in JSON mode when the model slips).
 * Rate limits are rethrown untouched: the worker decides how to wait.
 */
export async function completeJson<T>(
  provider: LlmProvider,
  request: Omit<LlmCompletionRequest, "json">,
  parse: (value: unknown) => T | null,
  context: { label: string; repoName: string }
): Promise<T> {
  const lastMessage = request.messages[request.messages.length - 1];
  const attempts: LlmCompletionRequest[] = [
    { ...request, json: true },
    {
      ...request,
      temperature: 0,
      json: false,
      messages: [
        ...request.messages.slice(0, -1),
        {
          ...lastMessage,
          content:
            lastMessage.content +
            "\n\nCRITICAL: return ONLY valid JSON matching the shape above. No markdown, no comments, no trailing text.",
        },
      ],
    },
  ];

  let lastFailure: LlmAnalysisUnavailableError["code"] = "invalid_json";

  for (const [index, attempt] of attempts.entries()) {
    const attemptNumber = index + 1;
    let text: string;

    try {
      const completion =
        provider instanceof BudgetedProvider
          ? await provider.complete(attempt, context.label)
          : await provider.complete(attempt);
      text = completion.text;
      logger.info("llm.response_received", {
        ...context,
        attempt: attemptNumber,
        provider: provider.name,
        model: completion.model,
        rawLength: text.length,
        inputTokens: completion.usage?.inputTokens ?? null,
        outputTokens: completion.usage?.outputTokens ?? null,
      });
    } catch (error) {
      if (error instanceof LlmRateLimitError) throw error;

      logger.warn("llm.provider_request_failed", { ...context, attempt: attemptNumber }, error);
      lastFailure = "provider_request_failed";
      continue;
    }

    const parsed = tryParseJson(text);
    const value = parsed.ok ? parse(parsed.value) : null;
    if (value !== null) return value;

    lastFailure = "invalid_json";
    logger.warn("llm.response_invalid", {
      ...context,
      attempt: attemptNumber,
      rawLength: text.length,
      reason: parsed.ok ? "schema_mismatch" : parsed.error,
    });
  }

  throw new LlmAnalysisUnavailableError(
    lastFailure === "invalid_json"
      ? `LLM returned an unusable answer twice (${context.label})`
      : `LLM provider request failed (${context.label})`,
    lastFailure
  );
}

export function tryParseJson(s: string): { ok: true; value: any } | { ok: false; error: string } {
  try {
    const trimmed = s.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return { ok: false, error: "no_json_object_found" };
    }

    const candidate = trimmed.slice(start, end + 1);
    const obj = JSON.parse(candidate);
    return { ok: true, value: obj };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "json_parse_error" };
  }
}
