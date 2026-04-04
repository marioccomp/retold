"use server"

import { ActionResponse } from "@/lib/action-response"
import { ProjectAccessError, requireProjectAccess } from "@/src/domains/project/lib/project-access"
import { requireAuthenticatedUserId, UnauthorizedError } from "@/src/lib/server-auth"
import { prisma } from "@repo/database"
import { createLogger } from "@repo/observability"
import { revalidatePath } from "next/cache"

const logger = createLogger("web.action.toggle-like")

export async function toggleLike(projectId: number): Promise<ActionResponse> {
    try {
        const userId = await requireAuthenticatedUserId()
        const project = await requireProjectAccess(projectId, userId)

        const existingLike = await prisma.like.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId,
                },
            },
        })

        if (existingLike) {
            await prisma.like.delete({
                where: {
                    userId_projectId: {
                        userId,
                        projectId,
                    },
                },
            })
        } else {
            await prisma.like.create({
                data: {
                    userId,
                    projectId,
                },
            })

            if (project.userId !== userId) {
                const lastNotification = await prisma.notification.findFirst({
                    where: {
                        userId: project.userId,
                        sourceUserId: userId,
                        type: "LIKE",
                        projectId,
                    },
                })

                if (!lastNotification) {
                    await prisma.notification.create({
                        data: {
                            userId: project.userId,
                            sourceUserId: userId,
                            type: "LIKE",
                            projectId,
                        },
                    })
                }
            }
        }

        revalidatePath(`/projects/${projectId}`)
        return { success: true }
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return { success: false, message: "Unauthorized" }
        }

        if (error instanceof ProjectAccessError) {
            return { success: false, message: "Project not found" }
        }

        logger.error("project.like_toggle_failed", error, {
            projectId,
        })
        return { success: false, message: "Failed to toggle like" }
    }
}
