import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, userAnalyzeAdd, lastCommitAdd } = vi.hoisted(() => ({
  findMany: vi.fn(),
  userAnalyzeAdd: vi.fn(),
  lastCommitAdd: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  prisma: { project: { findMany } },
}));

vi.mock("@repo/queue", () => ({
  userAnalyzeQueue: { add: userAnalyzeAdd },
  lastCommitQueue: { add: lastCommitAdd },
}));

import {
  STATS_RECALC_DEBOUNCE_MS,
  handlePushEvent,
  isDefaultBranchPush,
} from "./push-webhook.service";

const basePayload = {
  ref: "refs/heads/main",
  repository: { id: 22, default_branch: "main" },
  commits: [{ id: "abc123" }],
};

describe("handlePushEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userAnalyzeAdd.mockResolvedValue({});
    lastCommitAdd.mockResolvedValue({});
  });

  it("ignores pushes to branches other than the default branch", async () => {
    const result = await handlePushEvent({ ...basePayload, ref: "refs/heads/feature/login" });

    expect(result).toEqual({ processed: false, reason: "not_default_branch" });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("ignores tag pushes and pushes without commits", async () => {
    await expect(handlePushEvent({ ...basePayload, ref: "refs/tags/v1.0.0" })).resolves.toEqual({
      processed: false,
      reason: "not_default_branch",
    });
    await expect(handlePushEvent({ ...basePayload, commits: [] })).resolves.toEqual({
      processed: false,
      reason: "no_commits",
    });
  });

  it("reports pushes to repositories nobody linked", async () => {
    findMany.mockResolvedValue([]);

    await expect(handlePushEvent(basePayload)).resolves.toEqual({
      processed: false,
      reason: "no_linked_projects",
    });
  });

  it("schedules a debounced stats recalculation for every linked public project", async () => {
    findMany.mockResolvedValue([
      { id: 1, userId: 10, visibility: "public" },
      { id: 2, userId: 20, visibility: "public" },
      { id: 3, userId: 30, visibility: "private" },
    ]);

    const result = await handlePushEvent(basePayload);

    expect(result).toEqual({ processed: true, projectIds: [1, 2], userIds: [10, 20, 30] });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { repository: { githubId: 22, isActive: true } },
      })
    );

    expect(userAnalyzeAdd).toHaveBeenCalledTimes(2);
    expect(userAnalyzeAdd).toHaveBeenCalledWith(
      "analyze-user",
      { projectId: 1 },
      expect.objectContaining({
        delay: STATS_RECALC_DEBOUNCE_MS,
        deduplication: {
          id: "push-stats-1",
          ttl: STATS_RECALC_DEBOUNCE_MS,
          extend: true,
          replace: true,
        },
      })
    );

    // The last-commit card is refreshed for every linked user (it filters by author).
    expect(lastCommitAdd).toHaveBeenCalledTimes(3);
    expect(lastCommitAdd).toHaveBeenCalledWith(
      "refresh-last-commit",
      { userId: 30 },
      expect.objectContaining({
        deduplication: expect.objectContaining({ id: "push-last-commit-30" }),
      })
    );
  });
});

describe("isDefaultBranchPush", () => {
  it("requires the ref to match the repository default branch exactly", () => {
    expect(isDefaultBranchPush(basePayload)).toBe(true);
    expect(isDefaultBranchPush({ ...basePayload, ref: "refs/heads/main-old" })).toBe(false);
    expect(isDefaultBranchPush({ ...basePayload, repository: { id: 22 } })).toBe(false);
  });
});
