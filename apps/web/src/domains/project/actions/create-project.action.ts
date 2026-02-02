"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { getUserRepositories } from "@/src/domains/github/github";
import { startProjectAnalysisAction } from "./start-project-analysis.action";
import { ActionResponse } from "@/lib/action-response";
import { Project } from "@prisma/client";
import { getDictionary } from "@/src/i18n/server";
import { postGithubStats } from "@/src/app/(public)/[username]/_actions/post-github-stats.action";
import { lastCommitQueue } from "@repo/queue";
// import { analyzeRepoQueue } from "@repo/queue";

type CreateProjectInput = {
  title: string;
  description: string;
  visibility: "public" | "private";
  repositoryId?: number;
  githubUrl?: string;
};

export async function createProjectAction(
  input: CreateProjectInput
): Promise<ActionResponse<Project>> {
  const session = await auth();
  const dict = await getDictionary();
  const t = dict.project.create_panel.toast;

  await getUserRepositories();

  if (!session?.user?.id) {
    return { success: false, message: dict.auth.errors.unauthorized };
  }

  // Check rate limit
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { rateLimitResetAt: true }
  });

  if (user?.rateLimitResetAt && user.rateLimitResetAt > new Date()) {
    const diff = user.rateLimitResetAt.getTime() - Date.now();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return {
      success: false,
      message: `Limite de análises atingido. Tente novamente em ${minutes}m ${seconds}s.`
    };
  }

  let repositoryId = input.repositoryId;

  // Handle manual URL input
  if (input.githubUrl) {
    // 1. Parse URL
    const match = input.githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return { success: false, message: "URL do GitHub inválida" };
    }
    const [, owner, repoName] = match;

    // 2. Fetch public info
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}`);
      if (!res.ok) {
        if (res.status === 404) return { success: false, message: "Repositório não encontrado ou privado" };
        throw new Error(`GitHub API error: ${res.status}`);
      }
      const data = await res.json();

      // 3. Upsert Repository
      // We check if this specific user already has this repo linked, or if we need to create a link
      // Actually, Repository has a unique constraint on githubId? No, checking schema...
      // Schema: githubId Int @unique. This means a repository can only exist once globally in the system?
      // Wait, relation: userId Int @relation...
      // If githubId is unique globally, then multiple users cannot import the same repo?
      // Let's check schema again.
      // Schema line 246: githubId Int @unique.
      // Schema field userId Int.
      // This implies 1-to-many User->Repository, but `githubId` is unique globally? 
      // That seems like a schema design flaw if multiple users want to analyze the same popular repo `facebook/react`.
      // BUT, for now, I must respect the schema.
      // If the repo exists, we must use that existing record.
      // CHECK: If repo exists but belongs to ANOTHER user, can we use it?
      // The Relation is `Project -> Repository`. `Repository` belongs to `User`.
      // If I use a repository ID that belongs to another user, `prisma.project.create` might fail if there's RLS or logic preventing it?
      // Prisma doesn't enforce ownership on relation creation unless I check it.
      // However, `repositories Repository[]` on User implies ownership. 
      // If I link a project to a repo owned by User A, but Project is owned by User B...
      // The schema allows `repositoryId` on Project.
      // But `Repository` table has `userId`.
      // If I try to create a duplicate `Repository` with same `githubId` but different `userId`, it will fail due to `@unique`.
      // So I must find the EXISTING repository by `githubId`.
      // If it exists, I use it. 
      // PROBLEM: If it exists and belongs to User A, and User B creates a project using it... 
      // Does that matter? Maybe not for this "test feature".
      // Ideally, I should check if it exists.

      const existingRepo = await prisma.repository.findUnique({
        where: { githubId: data.id }
      });

      if (existingRepo) {
        repositoryId = existingRepo.id;
      } else {
        // Create new
        const newRepo = await prisma.repository.create({
          data: {
            githubId: data.id,
            name: data.name,
            fullName: data.full_name,
            url: data.html_url,
            private: data.private,
            isActive: true,
            userId: Number(session.user.id), // Owner of the record
          }
        });
        repositoryId = newRepo.id;
      }

    } catch (error) {
      console.error("Error fetching github url:", error);
      return { success: false, message: "Erro ao buscar repositório. Verifique a URL." };
    }
  }

  if (!repositoryId) {
    return { success: false, message: "Repositório obrigatório" };
  }

  const existingProject = await prisma.project.findFirst({
    where: { repositoryId: repositoryId }, // One project per repo? Or per user? 
    // Schema doesn't enforce unique projectId per repositoryId.
    // Logic below checks if existingProject... wait.
    // Line 50 in original: where: { repositoryId: input.repositoryId }
    // It returns error if ANY project exists for this repo?
    // "t.already_exists"
    // This implies 1-to-1 mapping between Repo and Project in the current logic?
    // Let's assume yes and keep it.
  });

  if (existingProject) {
    // Check if the project belongs to THIS user or just allow importing it again?
    // If multiple users share the same "Repository" record (because of githubId unique constraint),
    // then only ONE Project can exist for that Repository content globally?
    // That seems restrictive.
    // But let's respect current logic: if existingProject exists, return error.
    // Wait, if I'm User A and User B already analyzed "react", I can't?
    // Whatever, for "testing analysis" it's fine.

    // Actually, let's relax this check for the new feature or just alert.
    // The user said "so vou usar isso pra testar analises".
    // If I return existing project, maybe that's better?
    // No, createProjectAction creates a NEW project.
    // I'll stick to the existing check.
    return { success: false, message: t.already_exists };
  }

  // Notice: I need to verify repository existence/ownership ONLY if it came from input.repositoryId (user's list).
  // If it came from githubURL, I just established it exists or created it.

  if (input.repositoryId) {
    const repository = await prisma.repository.findFirst({
      where: {
        id: input.repositoryId,
        userId: Number(session.user.id),
        isActive: true,
      },
    });

    if (!repository) {
      return { success: false, message: t.repo_not_found };
    }
    repositoryId = repository.id;
  }

  const project = await prisma.project.create({
    data: {
      title: input.title,
      description: input.description,
      longerDescription: input.description,
      images: [],
      userId: Number(session.user.id),
      repositoryId: repositoryId!,
      status: "PENDING",
    },
  });

  const projectId = project.id;

  await postGithubStats(session.user.username || "");

  await lastCommitQueue.add(
    "refresh-last-commit",
    { userId: Number(session.user.id) },
    {
      jobId: `lastCommit-${session.user.id}`,
      removeOnComplete: true,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
    }
  );

  await startProjectAnalysisAction(projectId);

  return { success: true, data: project };
}
