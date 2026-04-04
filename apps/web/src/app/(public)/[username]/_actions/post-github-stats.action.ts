"use server";

import { githubRepository, prisma, userRepository } from "@repo/database";
import { Octokit } from "octokit";
import { projectRepository } from "@repo/database";
import { ActionResponse } from "@/lib/action-response";
import { auth } from "@/src/domains/auth/auth";
import { createLogger } from "@repo/observability";

const logger = createLogger("web.action.post-github-stats");

export async function postGithubStats(): Promise<ActionResponse> {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  if (!userId || Number.isNaN(userId)) {
    return {
      success: false,
      message: "Unauthorized",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { githubInstallations: true },
  });

  if (!user || user.githubInstallations.length === 0)
    return {
      success: false,
      message: "No github installations found",
    };

  const githubLogin = user.githubInstallations[0].accountLogin;

  try {
    const token = await githubRepository.getTokenByUserId(user.id);
    const octokit = new Octokit({ auth: token });

    const userProjects = await projectRepository.getAllProjects(user.id);

    const [repoData, prData] = await Promise.all([
      octokit.rest.apps.listReposAccessibleToInstallation({
        per_page: 100,
      }),
      octokit.rest.search.issuesAndPullRequests({
        q: `author:${githubLogin} type:pr`,
        per_page: 1,
      }),
    ]);

    const { data } = repoData;

    const userProjectRepositories = data.repositories.filter((repo) =>
      userProjects.some((p) => p.repository?.fullName === repo.full_name)
    );

    let totalStars = 0;
    const languages: Record<string, number> = {};

    userProjectRepositories.forEach((repo) => {
      totalStars += repo.stargazers_count || 0;
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
    });

    const topLanguages = Object.entries(languages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    await userRepository.createOrUpdateGithubStats(user.id, {
      totalStars,
      totalRepositories: data.total_count,
      totalPRs: prData.data.total_count,
      topLanguages,
    });

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "No github installations found") {
      return {
        success: false,
        message: "No github installations found",
      };
    }
    logger.error("github.stats_refresh_failed", error, {
      userId,
    });
    return {
      success: false,
      message: "Error fetching github stats",
    };
  }
}
