import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  getDictionaryMock,
  getUserRepositoriesMock,
  startProjectAnalysisActionMock,
  postGithubStatsMock,
  queueAddMock,
  prismaMock,
  revalidatePathMock,
  revalidateTagMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getDictionaryMock: vi.fn(),
  getUserRepositoriesMock: vi.fn(),
  startProjectAnalysisActionMock: vi.fn(),
  postGithubStatsMock: vi.fn(),
  queueAddMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
    },
    repository: {
      findFirst: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock("@/src/domains/auth/auth", () => ({
  auth: authMock,
}));

vi.mock("@/src/i18n/server", () => ({
  getDictionary: getDictionaryMock,
}));

vi.mock("@/src/domains/github/github", () => ({
  getUserRepositories: getUserRepositoriesMock,
}));

vi.mock("./start-project-analysis.action", () => ({
  startProjectAnalysisAction: startProjectAnalysisActionMock,
}));

vi.mock("@/src/app/(public)/[username]/_actions/post-github-stats.action", () => ({
  postGithubStats: postGithubStatsMock,
}));

vi.mock("@repo/queue", () => ({
  lastCommitQueue: {
    add: queueAddMock,
  },
}));

vi.mock("@repo/database", () => ({
  prisma: prismaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}));

import { createProjectAction } from "./create-project.action";

describe("createProjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    authMock.mockResolvedValue({
      user: {
        id: "7",
      },
    });
    getDictionaryMock.mockResolvedValue({
      auth: {
        errors: {
          unauthorized: "Unauthorized",
        },
      },
      project: {
        create_panel: {
          toast: {
            repo_not_found: "Repository not found",
            already_exists: "Project already exists",
            internal_error_cooldown: "Internal error cooldown: {time}",
          },
        },
        analysis: {
          retry_time_hours: "{hours}h {minutes}m",
          retry_time_minutes: "{minutes}m",
        },
      },
    });
    getUserRepositoriesMock.mockResolvedValue([]);
    prismaMock.user.findUnique.mockResolvedValue({
      rateLimitResetAt: null,
    });
    prismaMock.repository.findFirst.mockResolvedValue({
      id: 22,
      userId: 7,
      isActive: true,
    });
    prismaMock.project.findFirst.mockResolvedValue(null);
    prismaMock.project.create.mockResolvedValue({
      id: 101,
      title: "Created project",
      status: "PENDING",
    });
    postGithubStatsMock.mockResolvedValue({ success: true });
    queueAddMock.mockResolvedValue({ id: "last-commit-7" });
  });

  it("should create the project even when analysis is quota-blocked", async () => {
    startProjectAnalysisActionMock.mockResolvedValue({
      queued: false,
      limitReached: true,
      hoursLeft: 2,
      minutesLeft: 15,
      limit: 5,
    });

    const result = await createProjectAction({
      title: "Project",
      description: "Saved even when analysis cannot start",
      visibility: "public",
      repositoryId: 22,
    });

    expect(result).toEqual({
      success: true,
      data: { id: 101 },
      analysisStatus: "quota_blocked",
      hoursLeft: 2,
      minutesLeft: 15,
      limit: 5,
    });
    expect(prismaMock.project.create).toHaveBeenCalledTimes(1);
    expect(startProjectAnalysisActionMock).toHaveBeenCalledWith(101);
  });

  it("should keep the project created when analysis enqueue fails", async () => {
    startProjectAnalysisActionMock.mockRejectedValue(new Error("queue offline"));

    const result = await createProjectAction({
      title: "Project",
      description: "Saved even when queue is offline",
      visibility: "private",
      repositoryId: 22,
    });

    expect(result).toEqual({
      success: true,
      data: { id: 101 },
      analysisStatus: "enqueue_failed",
    });
    expect(prismaMock.project.create).toHaveBeenCalledTimes(1);
  });

  it("should block creation when the user is in internal cooldown window", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      rateLimitResetAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const result = await createProjectAction({
      title: "Project",
      description: "Should be blocked",
      visibility: "public",
      repositoryId: 22,
    });

    if (result.success) {
      throw new Error("expected project creation to be blocked by cooldown");
    }

    expect(result.message).toContain("Internal error cooldown:");
    expect(prismaMock.project.create).not.toHaveBeenCalled();
  });
});
