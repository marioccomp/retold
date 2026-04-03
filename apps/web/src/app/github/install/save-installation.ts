"use server";

import { prisma, githubRepository } from "@repo/database";
import {
  assertInstallationBelongsToLinkedGithubIdentity,
  getLinkedGithubIdentityForUser,
  GithubInstallationAuthorizationError,
} from "@/src/domains/github/github-installation-authorization";

interface SaveInstallationInput {
  installationId: string;
  userId: number;
}

export async function saveGithubInstallation({ installationId, userId }: SaveInstallationInput) {
  const existingInstallation = await prisma.githubAppInstallation.findUnique({
    where: { installationId },
    select: {
      userId: true,
    },
  });

  if (existingInstallation) {
    if (existingInstallation.userId !== userId) {
      throw new GithubInstallationAuthorizationError(
        "GITHUB_INSTALLATION_ALREADY_CLAIMED",
        "GitHub App installation is already linked to another account"
      );
    }

    return;
  }


  const octokit = githubRepository.getOctokitFromInstallationId(installationId);


  const { data } = await octokit.rest.apps.getInstallation({
    installation_id: Number(installationId),
  });


  const account = data.account;

  const accountLogin =
    account && "slug" in account && typeof account.slug === "string"
      ? account.slug
      : account && "login" in account && typeof account.login === "string"
        ? account.login
        : "unknown";
  const accountType =
    account && "type" in account && typeof account.type === "string"
      ? account.type
      : account && "slug" in account
        ? "Organization"
        : "User";

  const linkedIdentity = await getLinkedGithubIdentityForUser(userId);

  assertInstallationBelongsToLinkedGithubIdentity({
    accountLogin,
    accountType,
    linkedIdentity,
  });


  await prisma.githubAppInstallation.create({
    data: {
      installationId,
      accountLogin,
      accountType,
      userId,
    },
  });

}
