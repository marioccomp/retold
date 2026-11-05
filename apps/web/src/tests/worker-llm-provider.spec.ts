import { describe, expect, it } from "vitest";

import {
  completeJson,
  LlmAnalysisUnavailableError,
} from "../../../../services/worker/llm/analyze-project";
import { toGroqRateLimitError } from "../../../../services/worker/llm/groq-provider";
import {
  createLlmProvider,
  LlmCompletionRequest,
  LlmProvider,
  LlmRateLimitError,
  parseDurationMs,
} from "../../../../services/worker/llm/index";

/** Provider that replays scripted results (a string or an Error) in order. */
function scriptedProvider(results: Array<string | Error>) {
  const requests: LlmCompletionRequest[] = [];
  const provider: LlmProvider = {
    name: "fake",
    model: "fake-model",
    async complete(request) {
      requests.push(request);
      const next = results.shift();
      if (next === undefined) throw new Error("No scripted result left");
      if (next instanceof Error) throw next;
      return { text: next, model: "fake-model", usage: { inputTokens: 10, outputTokens: 5 } };
    },
  };
  return { provider, requests };
}

/** Any JSON object is accepted unless it has "reject": true. */
const acceptUnlessRejected = (value: unknown) =>
  (value as { reject?: boolean }).reject ? null : value;

function analyze(provider: LlmProvider) {
  return completeJson(
    provider,
    { messages: [{ role: "user", content: "Review the project." }] },
    acceptUnlessRejected,
    { label: "test", repoName: "api" }
  );
}

describe("parseDurationMs", () => {
  it.each([
    ["Please try again in 7m12.48s.", 432_480],
    ["Please try again in 586ms.", 586],
    ["Please try again in 1h2m", 3_720_000],
    ["Please try again in 30s", 30_000],
    ["30s", 30_000],
  ])("parses %s", (text, expected) => {
    expect(parseDurationMs(text)).toBe(expected);
  });

  it("returns null when there is no duration", () => {
    expect(parseDurationMs("Rate limit reached")).toBeNull();
  });
});

describe("toGroqRateLimitError", () => {
  it("prefers the retry-after header", () => {
    const error = toGroqRateLimitError({
      status: 429,
      message: "429 Rate limit reached. Please try again in 7m12s",
      headers: new Headers({ "retry-after": "12" }),
    });

    expect(error).toBeInstanceOf(LlmRateLimitError);
    expect(error?.retryAfterMs).toBe(12_000);
  });

  it("falls back to the message, including millisecond waits", () => {
    const error = toGroqRateLimitError({
      status: 429,
      message: "Rate limit reached for model. Please try again in 586ms.",
    });

    expect(error?.retryAfterMs).toBe(586);
  });

  it("does not treat a request larger than the per-minute budget as retryable", () => {
    // Real Groq free-tier message (gpt-oss-120b, 2026-11-05). Waiting never helps here,
    // so it must not become RATE_LIMITED (which reschedules the analysis forever).
    const error = toGroqRateLimitError({
      status: 429,
      message:
        "Request too large for model `openai/gpt-oss-120b` in organization `org_x` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Requested 9314, please reduce your message size and try again.",
    });

    expect(error).toBeNull();
  });

  it("ignores errors that are not rate limits", () => {
    expect(toGroqRateLimitError({ status: 500, message: "Internal error" })).toBeNull();
  });
});

describe("completeJson", () => {
  it("returns the parsed JSON from the first attempt in JSON mode", async () => {
    const { provider, requests } = scriptedProvider(['{"summary":{"title":"API"}}']);

    await expect(analyze(provider)).resolves.toEqual({ summary: { title: "API" } });
    expect(requests).toHaveLength(1);
    expect(requests[0].json).toBe(true);
  });

  it("retries once without JSON mode when the first answer is invalid", async () => {
    const { provider, requests } = scriptedProvider(["not json", '{"ok":true}']);

    await expect(analyze(provider)).resolves.toEqual({ ok: true });
    expect(requests).toHaveLength(2);
    expect(requests[1].json).toBe(false);
  });

  it("retries when the JSON is valid but does not match the expected shape", async () => {
    const { provider, requests } = scriptedProvider(['{"reject":true}', '{"ok":true}']);

    await expect(analyze(provider)).resolves.toEqual({ ok: true });
    expect(requests).toHaveLength(2);
    expect(requests[1].messages.at(-1)?.content).toContain("return ONLY valid JSON");
  });

  it("still tries the second attempt when the first request fails", async () => {
    const { provider } = scriptedProvider([new Error("json_validate_failed"), '{"ok":true}']);

    await expect(analyze(provider)).resolves.toEqual({ ok: true });
  });

  it("propagates rate limits untouched so the worker can schedule a retry", async () => {
    const rateLimit = new LlmRateLimitError("limited", 586);
    const { provider, requests } = scriptedProvider([rateLimit]);

    await expect(analyze(provider)).rejects.toBe(rateLimit);
    expect(requests).toHaveLength(1);
  });

  it("reports invalid_json when both answers are invalid", async () => {
    const { provider } = scriptedProvider(["nope", "still nope"]);

    await expect(analyze(provider)).rejects.toMatchObject({
      name: "LlmAnalysisUnavailableError",
      code: "invalid_json",
    });
  });

  it("reports provider_request_failed when the last attempt errored", async () => {
    const { provider } = scriptedProvider(["nope", new Error("boom")]);

    const error = (await analyze(provider).catch((e: unknown) => e)) as LlmAnalysisUnavailableError;
    expect(error).toBeInstanceOf(LlmAnalysisUnavailableError);
    expect(error.code).toBe("provider_request_failed");
  });
});

describe("createLlmProvider", () => {
  it("defaults to Groq and accepts a model override", () => {
    const provider = createLlmProvider({ ...process.env, LLM_PROVIDER: undefined, LLM_MODEL: "some-model" });
    expect(provider.name).toBe("groq");
    expect(provider.model).toBe("some-model");
  });

  it("rejects unknown providers", () => {
    expect(() => createLlmProvider({ ...process.env, LLM_PROVIDER: "nope" })).toThrow(
      'Unknown LLM_PROVIDER "nope"'
    );
  });
});
