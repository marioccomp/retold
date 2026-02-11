import { Worker } from "bullmq";
import { redisConnection } from "@repo/queue";
import { prisma, githubRepository } from "@repo/database";
import { execSync, spawn } from "child_process";
import path from "path";
import fs from "fs";
import { cloneRepository } from "./clone";

console.log("[worker] Starting user worker...");

export const userWorker = new Worker(
  "user-analyze",
  async (job) => {
    const { projectId, userEmail, githubUsername } = job.data;

    const tmpPath = path.resolve("/tmp/retold-user-analysis", String(projectId));

    console.log(`[user-worker] analyzing user stats for project ${projectId}`);

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { user: true, repository: true },
      });

      if (!project) throw new Error("Project not found");

      if (project.visibility === "private") {
        console.log(`[user-worker] Skipping stats for private project ${projectId}`);
        return;
      }

      // 1. Preparar o repositório
      // Se não tiver URL no projeto, tentamos pegar do repositório linkado ou abortar
      const repoUrl = project.repository?.url;
      if (!repoUrl) {
        console.log("[user-worker] No repository URL found, skipping analysis.");
        return;
      }

      // Token para clonar se for privado
      const token = await githubRepository.getToken(projectId);

      // Clone limpo para análise
      await cloneRepository(repoUrl, tmpPath, token);

      // --- ESTATÍSTICAS ---

      // Identificadores do user
      const primaryEmail = userEmail.toLowerCase().trim();
      const userIdentifier = githubUsername?.toLowerCase().trim() || primaryEmail.split("@")[0];
      // Lista de emails possíveis (poderíamos pegar mais do banco se tivesse)
      const targetEmails = [primaryEmail];

      // 1. Commits Count & Datas (First/Last)
      // git log --author="name_or_email" --format="%cd" --date=iso
      // Mas o author pode variar, então pegamos TUDO e filtramos no JS ou usamos --author com varias opcoes se o git deixar.
      // Mais seguro: git log --format="%aE|%cd" e filtrar

      const logOutput = execSync(`git -C "${tmpPath}" log --format="%aE|%cd"`, {
        encoding: "utf8",
      });
      const commits = logOutput.split("\n").filter(Boolean);

      let userCommitsCount = 0;
      let firstCommit: string | null = null;
      let lastCommit: string | null = null;
      const daysActive = new Set<string>(); // "YYYY-MM-DD"

      for (const line of commits) {
        const [email, dateStr] = line.split("|");
        const commitEmail = email.toLowerCase().trim();

        if (targetEmails.includes(commitEmail) || commitEmail.includes(userIdentifier)) {
          userCommitsCount++;
          const dateObj = new Date(dateStr);

          if (!lastCommit) lastCommit = dateStr; // A ordem do log é desc (mais recente primeiro)
          firstCommit = dateStr; // Vai atualizando até chegar no mais antigo

          const dayKey = dateObj.toISOString().split("T")[0];
          daysActive.add(dayKey);
        }
      }

      let linesAdded = 0;
      let linesDeleted = 0;

      try {
        const numstatOutput = execSync(`git -C "${tmpPath}" log --all --numstat --pretty="%aE"`, {
          encoding: "utf8",
        });
        const numstatLines = numstatOutput.split("\n");

        let isUserCommit = false;

        for (const line of numstatLines) {
          if (!line.trim()) continue;

          // Se linha tem @ é o cabeçalho do commit (autor)
          if (line.includes("@")) {
            const commitEmail = line.trim().toLowerCase();
            isUserCommit =
              targetEmails.includes(commitEmail) || commitEmail.includes(userIdentifier);
          } else if (isUserCommit) {
            // É linha de stats: "added deleted path"
            const parts = line.split("\t");
            if (parts.length >= 2) {
              const add = parseInt(parts[0]);
              const del = parseInt(parts[1]);
              if (!isNaN(add)) linesAdded += add;
              if (!isNaN(del)) linesDeleted += del;
            }
          }
        }
      } catch (e) {
        console.error("Erro ao calcular numstat lines", e);
      }

      console.log(`[user-worker] Stats calculated for ${project.id}:`);
      console.log(`- Commits: ${userCommitsCount}`);
      console.log(`- Lines Added: ${linesAdded}, Deleted: ${linesDeleted}`);
      console.log(`- Active Days: ${daysActive.size}`);

      // Salvar no Banco
      await prisma.userProjectStats.upsert({
        where: {
          userId_projectId: {
            userId: project.userId,
            projectId: projectId,
          },
        },
        create: {
          userId: project.userId,
          projectId: projectId,
          commitsCount: userCommitsCount,
          linesAdded,
          linesDeleted,
          activeDays: daysActive.size,
          firstCommitDate: firstCommit ? new Date(firstCommit) : null,
          lastCommitDate: lastCommit ? new Date(lastCommit) : null,
          impactScore: (linesAdded - linesDeleted) * 0.01 + userCommitsCount, // Exemplo simples
        },
        update: {
          commitsCount: userCommitsCount,
          linesAdded,
          linesDeleted,
          activeDays: daysActive.size,
          firstCommitDate: firstCommit ? new Date(firstCommit) : null,
          lastCommitDate: lastCommit ? new Date(lastCommit) : null,
          impactScore: (linesAdded - linesDeleted) * 0.01 + userCommitsCount,
        },
      });
    } catch (err) {
      console.error("[user-worker] error:", err);
      // Não damos throw para não re-enfileirar infinito se for erro de lógica,
      // mas em produção talvez queira retry
    } finally {
      if (fs.existsSync(tmpPath)) {
        fs.rmSync(tmpPath, { recursive: true, force: true });
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
);
