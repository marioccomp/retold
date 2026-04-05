import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { processPushEvent, loggerInfo, loggerWarn, loggerError } = vi.hoisted(() => ({
  processPushEvent: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  webhookRepository: {
    processPushEvent,
  },
}));

vi.mock("@repo/observability", () => ({
  createLogger: () => ({
    info: loggerInfo,
    warn: loggerWarn,
    error: loggerError,
  }),
}));

import { POST } from "./route";

function signBody(body: string) {
  const hmac = crypto.createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET!);
  return `sha256=${hmac.update(body).digest("hex")}`;
}

describe("POST /api/webhook/github", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_WEBHOOK_SECRET = "super-secret";
  });

  it("should reject requests with invalid signatures", async () => {
    const response = await POST(
      new Request("http://localhost/api/webhook/github", {
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
        headers: {
          "x-hub-signature-256": "sha256=invalid",
          "x-github-event": "push",
          "x-github-delivery": "delivery-1",
        },
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(processPushEvent).not.toHaveBeenCalled();
  });

  it("should answer ping events without calling the repository", async () => {
    const body = JSON.stringify({ zen: "Keep it logically awesome." });

    const response = await POST(
      new Request("http://localhost/api/webhook/github", {
        method: "POST",
        body,
        headers: {
          "x-hub-signature-256": signBody(body),
          "x-github-event": "ping",
          "x-github-delivery": "delivery-2",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "pong" });
    expect(processPushEvent).not.toHaveBeenCalled();
  });

  it("should process valid push events", async () => {
    processPushEvent.mockResolvedValue({
      processed: true,
      userId: 99,
    });

    const payload = {
      installation: { id: 11 },
      repository: { id: 22, full_name: "retold/app", name: "app", owner: { login: "retold" } },
      commits: [{ id: "abc123" }],
      ref: "refs/heads/main",
    };
    const body = JSON.stringify(payload);

    const response = await POST(
      new Request("http://localhost/api/webhook/github", {
        method: "POST",
        body,
        headers: {
          "x-hub-signature-256": signBody(body),
          "x-github-event": "push",
          "x-github-delivery": "delivery-3",
        },
      })
    );

    expect(processPushEvent).toHaveBeenCalledWith(payload);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, processed: true });
  });

  it("should return 500 when push processing throws", async () => {
    processPushEvent.mockRejectedValue(new Error("database failure"));

    const payload = {
      installation: { id: 11 },
      repository: { id: 22, full_name: "retold/app", name: "app", owner: { login: "retold" } },
      commits: [{ id: "abc123" }],
      ref: "refs/heads/main",
    };
    const body = JSON.stringify(payload);

    const response = await POST(
      new Request("http://localhost/api/webhook/github", {
        method: "POST",
        body,
        headers: {
          "x-hub-signature-256": signBody(body),
          "x-github-event": "push",
          "x-github-delivery": "delivery-4",
        },
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal Server Error" });
  });

  it("should accept unsupported events without processing them", async () => {
    const body = JSON.stringify({ installation: { id: 11 } });

    const response = await POST(
      new Request("http://localhost/api/webhook/github", {
        method: "POST",
        body,
        headers: {
          "x-hub-signature-256": signBody(body),
          "x-github-event": "issues",
          "x-github-delivery": "delivery-5",
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Event ignored" });
    expect(processPushEvent).not.toHaveBeenCalled();
  });
});
