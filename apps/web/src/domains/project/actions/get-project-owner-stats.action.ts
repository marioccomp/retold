"use server";

import { prisma } from "@repo/database";

export async function getProjectOwnerStats(projectId: number, ownerId: number) {
    try {
        const stats = await prisma.userProjectStats.findUnique({
            where: {
                userId_projectId: {
                    projectId,
                    userId: ownerId,
                },
            },
            select: {
                ownership: true,
            },
        });

        return stats;
    } catch (error) {
        console.error("Error fetching project owner stats:", error);
        return null;
    }
}
