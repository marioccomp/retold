"use server";

import { prisma } from "@repo/database";
import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";

interface SaveInstallationInput {
  installationId: string;
  userId: number;
}

export async function saveGithubInstallation({ installationId, userId }: SaveInstallationInput) {
  const exists = await prisma.githubAppInstallation.findUnique({
    where: { installationId },
  });

  if (exists) return;

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_PRIVATE_KEY!,
      installationId,
    },
  });

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
