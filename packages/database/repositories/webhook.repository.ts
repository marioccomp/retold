import { prisma } from "../index";

interface PushWebhookPayload {
  sender: { login: string };
  repository: { id: number; full_name: string };
  ref: string;
  commits: Array<{
    id: string;
    message: string;
    timestamp: string;
    added: string[];
    removed: string[];
    modified: string[];
    author: { name: string; email: string; username?: string };
  }>;
}

export interface WebhookRepository {
  processPushEvent(payload: PushWebhookPayload): Promise<{
    processed: boolean;
    userId?: number;
    reason?: string;
  }>;
}

export const webhookRepository: WebhookRepository = {
  async processPushEvent(payload: PushWebhookPayload) {
    const { sender, repository, commits, ref } = payload;
    const commitsCount = commits?.length || 0;

    if (commitsCount === 0) {
      return { processed: false, reason: "No commits in push" };
    }

    // Encontrar o usuário via GithubAppInstallation (accountLogin é o login do GitHub)
    const installation = await prisma.githubAppInstallation.findFirst({
      where: { accountLogin: sender.login },
      select: { userId: true },
    });

    if (!installation) {
      return { processed: false, reason: `No installation found for ${sender.login}` };
    }

    const userId = installation.userId;

    // Calcular linhas adicionadas/removidas a partir dos commits
    let linesAdded = 0;
    let linesDeleted = 0;
    for (const commit of commits) {
      linesAdded += commit.added?.length || 0;
      linesDeleted += commit.removed?.length || 0;
    }

    const lastCommitData = commits[commits.length - 1];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.$transaction(async (tx) => {
      // 1. Atualizar GithubStats (estatísticas globais do usuário)
      await tx.githubStats.upsert({
        where: { userId },
        create: {
          userId,
          totalStars: 0,
          totalRepositories: 0,
          totalPRs: 0,
          lastCommit: lastCommitData
            ? {
                sha: lastCommitData.id,
                message: lastCommitData.message,
                date: lastCommitData.timestamp,
                repo: repository.full_name,
              }
            : undefined,
          lastCommitFetchedAt: new Date(),
        },
        update: {
          lastCommit: lastCommitData
            ? {
                sha: lastCommitData.id,
                message: lastCommitData.message,
                date: lastCommitData.timestamp,
                repo: repository.full_name,
              }
            : undefined,
          lastCommitFetchedAt: new Date(),
        },
      });

      // 2. Encontrar repositório na DB pelo githubId
      const repo = await tx.repository.findUnique({
        where: { githubId: repository.id },
        include: { projects: { select: { id: true } } },
      });

      if (!repo) return;

      // 3. Atualizar UserProjectStats para cada projeto vinculado ao repositório
      for (const project of repo.projects) {
        const existing = await tx.userProjectStats.findUnique({
          where: {
            userId_projectId: { userId, projectId: project.id },
          },
        });

        const lastCommitDate = lastCommitData
          ? new Date(lastCommitData.timestamp)
          : new Date();

        if (existing) {
          // Calcular activeDays: incrementar se o último commit foi em um dia diferente
          const lastActive = existing.lastCommitDate;
          const isNewDay =
            !lastActive ||
            lastActive.toDateString() !== today.toDateString();

          await tx.userProjectStats.update({
            where: {
              userId_projectId: { userId, projectId: project.id },
            },
            data: {
              commitsCount: { increment: commitsCount },
              linesAdded: { increment: linesAdded },
              linesDeleted: { increment: linesDeleted },
              lastCommitDate,
              activeDays: isNewDay
                ? { increment: 1 }
                : existing.activeDays,
            },
          });
        } else {
          await tx.userProjectStats.create({
            data: {
              userId,
              projectId: project.id,
              commitsCount,
              linesAdded,
              linesDeleted,
              firstCommitDate: lastCommitDate,
              lastCommitDate,
              activeDays: 1,
            },
          });
        }
      }
    });

    return { processed: true, userId };
  },
};
