import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { currentSession, getUserRepositoriesMock, postGithubStatsMock } = vi.hoisted(() => ({
  currentSession: {
    value: null as any,
  },
  getUserRepositoriesMock: vi.fn(),
  postGithubStatsMock: vi.fn(),
}));

vi.mock("@/src/domains/auth/auth", () => ({
  auth: vi.fn(async () => currentSession.value),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/src/i18n/server", () => ({
  getDictionary: vi.fn(async () => ({
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
        },
      },
      analysis: {
        limit_reached_description: "Daily limit reached.",
        retry_time_hours: "{hours}h {minutes}m",
        retry_time_minutes: "{minutes}m",
      },
    },
  })),
  getAnalysisLocale: vi.fn(async () => "en"),
}));

vi.mock("@/src/domains/github/github", () => ({
  getUserRepositories: getUserRepositoriesMock,
}));

vi.mock("@/src/app/(public)/[username]/_actions/post-github-stats.action", () => ({
  postGithubStats: postGithubStatsMock,
}));

import { prisma } from "@repo/database";
import { createProjectAction } from "@/src/domains/project/actions/create-project.action";
import { startProjectAnalysisAction } from "@/src/domains/project/actions/start-project-analysis.action";
import {
  buildAuthSession,
  cleanupIntegrationRun,
  createIntegrationProject,
  createIntegrationRepository,
  createIntegrationRunId,
  createIntegrationUser,
  disconnectIntegrationDb,
} from "@/src/test-utils/integration-db";
import { cleanupAnalysisJob, cleanupLastCommitJob } from "@/src/test-utils/integration-queue";
import { DAILY_ANALYSIS_LIMIT } from "@/src/domains/project/constants";

describe("project actions integration", () => {
  const runsToCleanup = new Set<string>();
  const queuedProjectIds = new Set<number>();
  const queuedUserIds = new Set<number>();

  beforeEach(() => {
    currentSession.value = null;
    getUserRepositoriesMock.mockResolvedValue([]);
    postGithubStatsMock.mockResolvedValue({ success: true });
  });

  afterEach(async () => {
    currentSession.value = null;

    for (const projectId of queuedProjectIds) {
      await cleanupAnalysisJob(projectId);
    }
    queuedProjectIds.clear();

    for (const userId of queuedUserIds) {
      await cleanupLastCommitJob(userId);
    }
    queuedUserIds.clear();

    for (const runId of runsToCleanup) {
      await cleanupIntegrationRun(runId);
    }
    runsToCleanup.clear();
  });

  afterAll(async () => {
    await disconnectIntegrationDb();
  });

  it("should reject project creation for unauthenticated users", async () => {
    const result = await createProjectAction({
      title: "Unauthorized project",
      description: "Should not be created",
      visibility: "public",
      repositoryId: 1,
    });

    expect(result).toEqual({
      success: false,
      message: "Unauthorized",
    });
  });

  it("should create a project, persist it and enqueue the follow-up jobs", async () => {
    const runId = createIntegrationRunId("cpa");
    runsToCleanup.add(runId);

    const user = await createIntegrationUser(runId, { label: "owner" });
    const repository = await createIntegrationRepository(runId, {
      userId: user.id,
      label: "repo",
    });

    currentSession.value = buildAuthSession(user);

    const result = await createProjectAction({
      title: "Integration Project",
      description: "Created from integration test",
      visibility: "public",
      repositoryId: repository.id,
    });

    if (!result.success || result.analysisStatus !== "queued") {
      throw new Error(`expected a queued analysis result, got ${JSON.stringify(result)}`);
    }

    expect(result.data.id).toBeTypeOf("number");
    expect(result.remaining).toBe(DAILY_ANALYSIS_LIMIT - 1);

    const createdProject = await prisma.project.findUnique({
      where: {
        id: result.data!.id,
      },
    });

    expect(createdProject).toEqual(
      expect.objectContaining({
        userId: user.id,
        repositoryId: repository.id,
        title: "Integration Project",
        status: "ANALYZING",
      })
    );

    queuedProjectIds.add(result.data!.id);
    queuedUserIds.add(user.id);

    const analysisJob = await (await import("@repo/queue")).analyzeRepoQueue.getJob(
      `project-analysis-${result.data!.id}`
    );
    expect(analysisJob?.data).toEqual({
      projectId: result.data!.id,
      locale: "en",
    });

    const lastCommitJob = await (await import("@repo/queue")).lastCommitQueue.getJob(
      `lastCommit-${user.id}`
    );
    expect(lastCommitJob?.data).toEqual({
      userId: user.id,
    });
  });

  it("should reject project creation when the repository does not belong to the user", async () => {
    const runId = createIntegrationRunId("cpr");
    runsToCleanup.add(runId);

    const owner = await createIntegrationUser(runId, { label: "owner" });
    const otherUser = await createIntegrationUser(runId, { label: "other" });
    const repository = await createIntegrationRepository(runId, {
      userId: otherUser.id,
      label: "foreign-repo",
    });

    currentSession.value = buildAuthSession(owner);

    const result = await createProjectAction({
      title: "Blocked Project",
      description: "Should fail",
      visibility: "public",
      repositoryId: repository.id,
    });

    expect(result).toEqual({
      success: false,
      message: "Repository not found",
    });
  });

  it("should reject duplicate projects for the same repository", async () => {
    const runId = createIntegrationRunId("cpd");
    runsToCleanup.add(runId);

    const user = await createIntegrationUser(runId, { label: "owner" });
    const repository = await createIntegrationRepository(runId, {
      userId: user.id,
      label: "repo",
    });
    await createIntegrationProject(runId, {
      userId: user.id,
      repositoryId: repository.id,
      label: "existing-project",
    });

    currentSession.value = buildAuthSession(user);

    const result = await createProjectAction({
      title: "Duplicate",
      description: "Should not be duplicated",
      visibility: "public",
      repositoryId: repository.id,
    });

    expect(result).toEqual({
      success: false,
      message: "Project already exists",
    });
  });

  it("should block analysis start when the user is rate limited", async () => {
    const runId = createIntegrationRunId("spa");
    runsToCleanup.add(runId);

    const user = await createIntegrationUser(runId, { label: "owner" });
    const repository = await createIntegrationRepository(runId, {
      userId: user.id,
      label: "repo",
    });
    const project = await createIntegrationProject(runId, {
      userId: user.id,
      repositoryId: repository.id,
      label: "project",
    });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        rateLimitResetAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    currentSession.value = buildAuthSession(user);

    const result = await startProjectAnalysisAction(project.id);

    expect(result).toEqual(
      expect.objectContaining({
        queued: false,
        limitReached: true,
        remaining: 0,
        limit: DAILY_ANALYSIS_LIMIT,
      })
    );

    const analysisJob = await (await import("@repo/queue")).analyzeRepoQueue.getJob(
      `project-analysis-${project.id}`
    );
    expect(analysisJob).toBeFalsy();
  });
});
