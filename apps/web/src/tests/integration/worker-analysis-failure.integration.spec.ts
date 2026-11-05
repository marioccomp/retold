import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@repo/database";
import { markProjectAnalysisFailed } from "../../../../../services/worker/analysis-failure";
import {
  cleanupIntegrationRun,
  createIntegrationProject,
  createIntegrationRunId,
  createIntegrationUser,
} from "@/src/test-utils/integration-db";

const runIds: string[] = [];

afterEach(async () => {
  while (runIds.length > 0) {
    await cleanupIntegrationRun(runIds.pop()!);
  }
});

async function setupAnalyzingProject(dailyAnalysisCount: number) {
  const runId = createIntegrationRunId("fail");
  runIds.push(runId);

  const user = await createIntegrationUser(runId, { label: "owner" });
  await prisma.user.update({
    where: { id: user.id },
    data: { dailyAnalysisCount, dailyAnalysisDate: new Date() },
  });
  const project = await createIntegrationProject(runId, {
    userId: user.id,
    label: "project",
    status: "ANALYZING",
  });

  return { user, project };
}

describe("markProjectAnalysisFailed", () => {
  it("keeps the project, marks it ERROR and releases one reserved analysis", async () => {
    const { user, project } = await setupAnalyzingProject(3);

    await markProjectAnalysisFailed(project.id, { reason: "test" });

    const storedProject = await prisma.project.findUnique({ where: { id: project.id } });
    const storedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    expect(storedProject?.status).toBe("ERROR");
    expect(storedUser.dailyAnalysisCount).toBe(2);
    // No account-wide cooldown: the user can keep creating other projects.
    expect(storedUser.rateLimitResetAt).toBeNull();
  });

  it("releases the quota only once when called repeatedly", async () => {
    const { user, project } = await setupAnalyzingProject(3);

    await markProjectAnalysisFailed(project.id, { reason: "test" });
    await markProjectAnalysisFailed(project.id, { reason: "test" });

    const storedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(storedUser.dailyAnalysisCount).toBe(2);
  });

  it("does nothing for a project that no longer exists", async () => {
    await expect(
      markProjectAnalysisFailed(2_000_000_000, { reason: "test" })
    ).resolves.toBeUndefined();
  });
});
