"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { revalidatePath } from "next/cache";
import { postGithubStats } from "@/src/app/(public)/[username]/_actions/post-github-stats.action";

export async function deleteProjectAction(projectId: number) {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            userId: Number(session.user.id),
        },
    });

    if (!project) {
        throw new Error("Project not found or not owned by user");
    }

    await prisma.project.delete({
        where: {
            id: projectId,
        },
    });

    if (session.user.username) {
        await postGithubStats(session.user.username);
    }

    revalidatePath(`/${session.user.username}`);
    return { success: true };
}
