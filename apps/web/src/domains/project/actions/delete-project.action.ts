"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { revalidatePath } from "next/cache";
import { postGithubStats } from "@/src/app/(public)/[username]/_actions/post-github-stats.action";
import { lastCommitQueue } from "@repo/queue";

export async function deleteProjectAction(projectId: number) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: Number(session.user.id),
    },
  });

  if (!project) {
    throw new Error("Project not found or not owned by user");
  }

  await prisma.project.delete({
    where: {
      id: projectId,
    },
  });

  if (session.user.username) {
    await postGithubStats(session.user.username);
    await lastCommitQueue.add(
      "refresh-last-commit",
      { userId: Number(session.user.id) },
      {
        jobId: `lastCommit-${session.user.id}`,
        removeOnComplete: true,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: "exponential", delay: 30_000 },
      }
    );
  }

  revalidatePath(`/${session.user.username}`);
  return { success: true };
}
