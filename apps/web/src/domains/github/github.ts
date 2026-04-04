import { githubRepository } from "@repo/database";
import { Octokit } from "octokit";
import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";
import { createLogger } from "@repo/observability";

const logger = createLogger("web.domain.github");

export async function getUserRepositories() {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  if (!userId || Number.isNaN(userId)) {
    return [];
  }

  try {
    const token = await githubRepository.getTokenByUserId(userId);
    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
      per_page: 100,
    });

    await prisma.repository.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    await prisma.$transaction(
      data.repositories.map((repo) =>
        prisma.repository.upsert({
          where: { githubId: repo.id },
          update: {
            name: repo.name,
            fullName: repo.full_name,
            url: repo.html_url,
            private: repo.private,
            isActive: true,
          },
          create: {
            githubId: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            url: repo.html_url,
            private: repo.private,
            userId,
          },
        })
      )
    );

    return prisma.repository.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
        fullName: true,
        url: true,
        isActive: true,
      },
    });
  } catch (error) {
    logger.error("github.repositories_sync_failed", error, {
      userId,
    });
    return [];
  }
}
