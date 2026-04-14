"use server";

import { userRepository } from "@repo/database";
import { userAnalyzeQueue } from "@repo/queue";
import { mapUserToPublicProfile } from "@/src/domains/user/mappers/user-to-public-profile.mapper";
import { auth } from "@/src/domains/auth/auth";

export async function getProfile(
  username: string,
  projectsPage: number = 1,
  projectsQuery: string = "",
  projectsSort: "newest" | "oldest" | "popular" = "newest"
) {
  const session = await auth();
  const currentUserId = session?.user?.id ? Number(session.user.id) : undefined;
  const projectsLimit = 12;

  const user = await userRepository.findPublicProfileByUsername(
    username,
    currentUserId,
    projectsPage,
    projectsLimit,
    projectsQuery,
    projectsSort
  );
  if (!user) return null;

  const shouldBackfillUserStats =
    user.projects.some((project) => project.repository && project.visibility === "public") &&
    (user.userStats.length === 0 ||
      user.userStats.every(
        (stats) =>
          stats.commitsCount === 0 &&
          stats.linesAdded === 0 &&
          stats.linesDeleted === 0 &&
          stats.activeDays === 0
      ));

  if (shouldBackfillUserStats) {
    const uniqueProjectIds = Array.from(
      new Set(
        user.projects
          .filter((project) => project.repository && project.visibility === "public")
          .map((project) => project.id)
      )
    );

    void Promise.allSettled(
      uniqueProjectIds.map((projectId) =>
        userAnalyzeQueue.add(
          "analyze-user",
          { projectId },
          { jobId: `user-analysis-${projectId}` }
        )
      )
    );
  }

  return mapUserToPublicProfile(user!, currentUserId, projectsPage, projectsLimit);
}
