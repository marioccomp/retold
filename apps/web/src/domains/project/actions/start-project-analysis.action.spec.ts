import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  getAnalysisLocaleMock,
  queueAddMock,
  prismaMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getAnalysisLocaleMock: vi.fn(),
  queueAddMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock("@/src/domains/auth/auth", () => ({
  auth: authMock,
}));

vi.mock("@/src/i18n/server", () => ({
  getAnalysisLocale: getAnalysisLocaleMock,
}));

vi.mock("@repo/queue", () => ({
  analyzeRepoQueue: {
    add: queueAddMock,
  },
}));

vi.mock("@repo/database", () => ({
  prisma: prismaMock,
}));

import { startProjectAnalysisAction } from "./start-project-analysis.action";
import { DAILY_ANALYSIS_LIMIT, MANUAL_REANALYZE_COOLDOWN_MS } from "../constants";

describe("startProjectAnalysisAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: "7",
      },
    });
    getAnalysisLocaleMock.mockResolvedValue("en");
    prismaMock.project.findUnique.mockResolvedValue({
      id: 15,
      userId: 7,
      status: "DONE",
      updatedAt: new Date("2026-04-12T12:00:00.000Z"),
      repository: {
        url: "https://github.com/mario/example",
      },
    });
    prismaMock.user.findUnique.mockResolvedValue({
      dailyAnalysisCount: 0,
      dailyAnalysisDate: null,
      rateLimitResetAt: null,
    });
    prismaMock.$queryRaw.mockResolvedValue([
      {
        dailyAnalysisCount: 1,
      },
    ]);
    prismaMock.project.update.mockResolvedValue(undefined);
    prismaMock.$executeRaw.mockResolvedValue(1);
    queueAddMock.mockResolvedValue({ id: "job-1" });
  });

  it("should reserve quota before enqueueing the worker job", async () => {
    const result = await startProjectAnalysisAction(15);

    expect(result).toEqual(
      expect.objectContaining({
        queued: true,
        projectId: 15,
        remaining: DAILY_ANALYSIS_LIMIT - 1,
        limit: DAILY_ANALYSIS_LIMIT,
      })
    );
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(queueAddMock).toHaveBeenCalledWith(
      "analyze",
      {
        projectId: 15,
        locale: "en",
      },
      expect.objectContaining({
        jobId: "project-analysis-15",
      })
    );
    expect(prismaMock.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      queueAddMock.mock.invocationCallOrder[0]
    );
  });

  it("should release the reserved quota if queue enqueue fails", async () => {
    queueAddMock.mockRejectedValueOnce(new Error("queue offline"));

    await expect(startProjectAnalysisAction(15)).rejects.toThrow("queue offline");

    expect(prismaMock.project.update).toHaveBeenNthCalledWith(1, {
      where: { id: 15 },
      data: { status: "ANALYZING" },
    });
    expect(prismaMock.project.update).toHaveBeenNthCalledWith(2, {
      where: { id: 15 },
      data: { status: "PENDING" },
    });
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it("should not enqueue when the atomic reservation reports the daily limit", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([]);
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        dailyAnalysisCount: DAILY_ANALYSIS_LIMIT,
        dailyAnalysisDate: new Date(),
        rateLimitResetAt: null,
      })
      .mockResolvedValueOnce({
        dailyAnalysisCount: DAILY_ANALYSIS_LIMIT,
        dailyAnalysisDate: new Date(),
        rateLimitResetAt: null,
      });

    const result = await startProjectAnalysisAction(15);

    expect(result).toEqual(
      expect.objectContaining({
        queued: false,
        limitReached: true,
        remaining: 0,
        limit: DAILY_ANALYSIS_LIMIT,
      })
    );
    expect(queueAddMock).not.toHaveBeenCalled();
  });

  it("should block manual retry for a short cooldown window after an error", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-04-12T12:01:00.000Z");
    vi.setSystemTime(now);

    prismaMock.project.findUnique.mockResolvedValueOnce({
      id: 15,
      userId: 7,
      status: "ERROR",
      updatedAt: new Date(now.getTime() - 15_000),
      repository: {
        url: "https://github.com/mario/example",
      },
    });

    const result = await startProjectAnalysisAction(15);

    expect(result).toEqual({
      queued: false,
      retryBlocked: true,
      minutesLeft: 1,
      retryAvailableAt: new Date(
        now.getTime() - 15_000 + MANUAL_REANALYZE_COOLDOWN_MS
      ).toISOString(),
    });
    expect(queueAddMock).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
