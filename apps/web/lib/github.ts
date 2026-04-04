import { userRepository } from "@repo/database";
import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import { auth } from "@/src/domains/auth/auth";
import { createLogger } from "@repo/observability";

const logger = createLogger("web.lib.github");

export async function getUserRepositories() {
  // ISSO DEVE SER JOGADO PARA O DOMAIN GITHUB
  const session = await auth();
  const id = session?.user.id;
  const installation = await userRepository.getUserInstallationId(Number(id));

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

    return data.repositories;
  } catch (error) {
    logger.error("github.repositories_fetch_failed", error, {
      userId: Number(id),
    });
    return [];
  }
}
