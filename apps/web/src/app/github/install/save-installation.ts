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

  console.log(`[save-installation.ts] Criando octokit client usando GITHUB_PRIVATE_KEY...`);
  const octokit = githubRepository.getOctokitFromInstallationId(installationId);

  console.log(`[save-installation.ts] Buscando dados da instalacao na API do GitHub...`);
  const { data } = await octokit.rest.apps.getInstallation({
    installation_id: Number(installationId),
  });
  console.log(`[save-installation.ts] Sucesso! API Github autorizada. Preparando para banco...`);

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

  console.log(`[save-installation.ts] Inserindo ID ${installationId} no banco de dados Prisma!`);
  await prisma.githubAppInstallation.create({
    data: {
      installationId,
      accountLogin,
      accountType,
      userId,
    },
  });
  console.log(`[save-installation.ts] Instalacao gravada com sucesso!`);
}
