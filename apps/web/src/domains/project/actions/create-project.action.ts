"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { getUserRepositories } from "@/src/domains/github/github";
import { startProjectAnalysisAction } from "./start-project-analysis.action";
// import { analyzeRepoQueue } from "@repo/queue";

type CreateProjectInput = {
    title: string;
    description: string;
    visibility: "public" | "private";
    repositoryId: number;
};

export async function createProjectAction(input: CreateProjectInput) {
    const session = await auth();

    await getUserRepositories();

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const repository = await prisma.repository.findFirst({
        where: {
            id: input.repositoryId,
            userId: Number(session.user.id),
            isActive: true,
        },
    });

    if (!repository) {
        throw new Error("Repository not found");
    }

    const project = await prisma.project.create({
        data: {
            title: input.title,
            description: input.description,
            longerDescription: input.description,
            images: [],
            userId: Number(session.user.id),
            repositoryId: repository.id,
            status: "PENDING",
        },
    });

    const projectId = project.id;

    await startProjectAnalysisAction(projectId);

    // TODO: Uncomment when queue is ready
    // await analyzeRepoQueue.add(
    //   "analyze",
    //   {
    //     projectId: project.id,
    //     repositoryId: repository.id,
    //     repoUrl: repository.url,
    //   },
    //   {
    //     attempts: 3,
    //     backoff: {
    //       type: "exponential",
    //       delay: 5000,
    //     },
    //     removeOnComplete: true,
    //   }
    // );

    return project;
}
