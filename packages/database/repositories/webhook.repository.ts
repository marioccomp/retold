import { prisma, githubRepository } from "../index";
import { createLogger } from "@repo/observability";

const logger = createLogger("database.webhook-repository");

interface PushWebhookPayload {
  installation: { id: number };
  sender: { login: string };
  repository: { id: number; full_name: string; name: string; owner: { login: string } };
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
    const { sender, repository, commits, installation } = payload;
    const commitsCount = commits?.length || 0;

    if (commitsCount === 0) {
      return { processed: false, reason: "No commits in push" };
    }

    // 1. Encontrar o usuário via GithubAppInstallation
    const dbInstallation = await prisma.githubAppInstallation.findUnique({
      where: { installationId: String(installation.id) },
      select: { userId: true },
    });

    if (!dbInstallation) {
      return { processed: false, reason: `No installation found for ID ${installation.id}` };
    }

    const userId = dbInstallation.userId;

    // 2. Buscar estatísticas REAIS de cada commit via API do GitHub
    let linesAdded = 0;
    let linesDeleted = 0;

    try {
      const octokit = githubRepository.getOctokitFromInstallationId(String(installation.id));
      
      // Processamos em paralelo para ser rápido
      await Promise.all(
        commits.map(async (c) => {
          try {
            const { data: commitData } = await octokit.rest.repos.getCommit({
              owner: repository.owner.login,
              repo: repository.name,
              ref: c.id,
            });
            linesAdded += commitData.stats?.additions || 0;
            linesDeleted += commitData.stats?.deletions || 0;
          } catch (err) {
            logger.warn(
              "webhook.commit_stats_fetch_failed",
              {
                installationId: installation.id,
                repositoryId: repository.id,
                commitSha: c.id.slice(0, 8),
              },
              err
            );
          }
        })
      );
    } catch (err) {
      logger.error("webhook.octokit_initialization_failed", err, {
        installationId: installation.id,
        repositoryId: repository.id,
        commitCount: commitsCount,
      });
      // Se falhar a API, mantemos lines como 0 ou usamos o fallback de arquivos se preferir
    }

    const lastCommitData = commits[commits.length - 1];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.$transaction(async (tx) => {
      const repo = await tx.repository.findUnique({
        where: { githubId: repository.id },
        include: { projects: { select: { id: true } } },
      });

      if (!repo || repo.projects.length === 0) return;
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
