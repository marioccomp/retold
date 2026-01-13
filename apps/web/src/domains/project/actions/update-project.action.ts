"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { revalidatePath } from "next/cache";

type UpdateProjectInput = {
    id: number;
    title: string;
    description: string;
};

export async function updateProjectAction(input: UpdateProjectInput) {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const project = await prisma.project.findFirst({
        where: {
            id: input.id,
            userId: Number(session.user.id),
        },
    });

    if (!project) {
        throw new Error("Project not found or not owned by user");
    }

    const updatedProject = await prisma.project.update({
        where: {
            id: input.id,
        },
        data: {
            title: input.title,
            description: input.description,
            // Also update longerDescription to keep them in sync if it's the same
            longerDescription: input.description,
        },
    });

    revalidatePath(`/${session.user.username}`);
    return updatedProject;
}
