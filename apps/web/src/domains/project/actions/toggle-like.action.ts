"use server"

import { ActionResponse } from "@/lib/action-response"
import { auth } from "@/src/domains/auth/auth"
import { prisma } from "@repo/database"
import { revalidatePath } from "next/cache"

export async function toggleLike(projectId: number): Promise<ActionResponse> {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Unauthorized" }

    const userId = Number(session.user.id)

    const existingLike = await prisma.like.findUnique({
        where: {
            userId_projectId: {
                userId,
                projectId
            }
        }
    })

    if (existingLike) {
        await prisma.like.delete({
            where: {
                userId_projectId: {
                    userId,
                    projectId
                }
            }
        })
    }
    else {
        await prisma.like.create({
            data: {
                userId,
                projectId
            }
        })

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true }
        })

        if (project && project.userId !== userId) {
            // Evitar flood de notificações: só cria se não houver uma não lida do mesmo tipo/origem
            const lastNotification = await prisma.notification.findFirst({
                where: {
                    userId: project.userId,
                    sourceUserId: userId,
                    type: "LIKE",
                    projectId
                }
            });

            if (!lastNotification) {
                await prisma.notification.create({
                    data: {
                        userId: project.userId,
                        sourceUserId: userId,
                        type: "LIKE",
                        projectId
                    }
                })
            }
        }
    }

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
}