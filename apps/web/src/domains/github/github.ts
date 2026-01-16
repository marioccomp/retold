import { userRepository } from "@repo/database";
import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";

export async function getUserRepositories() {
  const session = await auth();
  const userId = Number(session?.user.id);
  const installation = await userRepository.getUserInstallationId(userId);

  if (!installation) {
    return [];
  }

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_PRIVATE_KEY,
      installationId: installation.installationId,
    },
  });

  try {
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
    console.error("Erro ao buscar repos: ", error);
    return [];
  }
}
