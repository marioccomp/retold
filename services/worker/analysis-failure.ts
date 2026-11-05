import { prisma } from "@repo/database";
import { createLogger } from "@repo/observability";

const logger = createLogger("worker.project-analysis");

function startOfDay(now: Date) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Final failure of an analysis job: release the quota reserved at enqueue time and
 * move the project to ERROR. Both happen in one transaction so a crash in between
 * can't release the quota without updating the status (or vice versa).
 */
export async function markProjectAnalysisFailed(
  projectId: number,
  context: { reason: string },
  now: Date = new Date()
) {
  const today = startOfDay(now);

  const outcome = await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: { userId: true, status: true },
    });

    if (!project) return { kind: "missing" as const };

    // Only a project that is still ANALYZING holds a reservation. The conditional
    // update makes the check-and-set atomic, so the quota is released at most once.
    const { count } = await tx.project.updateMany({
      where: { id: projectId, status: "ANALYZING" },
      data: { status: "ERROR" },
    });

    if (count === 0) return { kind: "not_analyzing" as const, status: project.status };

    await tx.$executeRaw`
      UPDATE "User"
      SET "dailyAnalysisCount" = CASE
        WHEN "dailyAnalysisDate" >= ${today} AND "dailyAnalysisCount" > 0
          THEN "dailyAnalysisCount" - 1
        ELSE "dailyAnalysisCount"
      END
      WHERE "id" = ${project.userId}
    `;

    return { kind: "marked" as const, userId: project.userId };
  });

  if (outcome.kind === "missing") {
    logger.warn("worker.failed_project_missing", { projectId, reason: context.reason });
  } else if (outcome.kind === "not_analyzing") {
    logger.warn("worker.failed_project_not_analyzing", {
      projectId,
      status: outcome.status,
      reason: context.reason,
    });
  } else {
    logger.warn("worker.project_marked_error", {
      projectId,
      userId: outcome.userId,
      reason: context.reason,
    });
  }
}
