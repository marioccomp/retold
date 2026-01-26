"use server";

import { prisma, githubRepository } from "@repo/database";

interface SaveInstallationInput {
  installationId: string;
  userId: number;
}

export async function saveGithubInstallation({ installationId, userId }: SaveInstallationInput) {
  const exists = await prisma.githubAppInstallation.findUnique({
    where: { installationId },
  });

  if (exists) return;

  const octokit = githubRepository.getOctokitFromInstallationId(installationId);

  const { data } = await octokit.rest.apps.getInstallation({
    installation_id: Number(installationId),
  });

  const account = data.account;

  let accountLogin = "unknown";
  let accountType = "Unknown";

  if (account && "login" in account) {
    accountLogin = account.login;
    accountType = "User";
  }

  if (account && "slug" in account) {
    accountLogin = account.slug;
    accountType = "Organization";
  }

  await prisma.githubAppInstallation.create({
    data: {
      installationId,
      accountLogin,
      accountType,
      userId,
    },
  });
}
