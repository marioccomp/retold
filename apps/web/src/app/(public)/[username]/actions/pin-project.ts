"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";

export async function toggleProjectPin(projectId: number) {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const userId = parseInt(session.user.id);

    // 1. Check if project belongs to user
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true, isPinned: true }
    });

    if (!project) {
        throw new Error("Project not found");
    }

    if (project.userId !== userId) {
        throw new Error("Unauthorized");
    }

    // 2. If pinning, check limit
    if (!project.isPinned) {
        const pinnedCount = await prisma.project.count({
            where: {
                userId,
                isPinned: true
            }
        });

        if (pinnedCount >= 3) {
            throw new Error("LIMIT_REACHED");
        }
    }

    // 3. Toggle
    await prisma.project.update({
        where: { id: projectId },
        data: {
            isPinned: !project.isPinned
        }
    });

    revalidatePath(`/${session.user.username}`);
}
