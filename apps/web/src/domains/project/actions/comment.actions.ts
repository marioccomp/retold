"use server"

import { ActionResponse } from "@/lib/action-response"
import { ProjectAccessError, requireProjectAccess } from "@/src/domains/project/lib/project-access"
import {
    getAuthenticatedUserId,
    requireAuthenticatedUserId,
    UnauthorizedError,
} from "@/src/lib/server-auth"
import { prisma } from "@repo/database"
import { revalidatePath } from "next/cache"

export async function createComment(
    projectId: number,
    content: string,
    parentId?: number
): Promise<ActionResponse> {
    const trimmedContent = content.trim()

    if (!trimmedContent) {
        return { success: false, message: "Comment cannot be empty" }
    }

    if (trimmedContent.length > 500) {
        return { success: false, message: "Comment too long (max 500 characters)" }
    }

    try {
        const userId = await requireAuthenticatedUserId()
        const project = await requireProjectAccess(projectId, userId)

        if (parentId) {
            const parentComment = await prisma.comment.findUnique({
                where: { id: parentId },
                select: { id: true, projectId: true },
            })

            if (!parentComment || parentComment.projectId !== projectId) {
                return { success: false, message: "Parent comment not found" }
            }
        }

        const comment = await prisma.comment.create({
            data: {
                content: trimmedContent,
                projectId,
                userId,
                parentId,
            },
        })

        if (project.userId !== userId) {
            await prisma.notification.create({
                data: {
                    userId: project.userId,
                    sourceUserId: userId,
                    type: "COMMENT",
                    projectId,
                    commentId: comment.id,
                },
            })
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

        console.error("Error creating comment:", error)
        return { success: false, message: "Failed to create comment" }
    }
}

export async function deleteComment(commentId: number, projectId: number): Promise<ActionResponse> {
    try {
        const userId = await requireAuthenticatedUserId()
        await requireProjectAccess(projectId, userId)

        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            select: { userId: true, projectId: true },
        })

        if (!comment || comment.projectId !== projectId || comment.userId !== userId) {
            return { success: false, message: "Unauthorized or comment not found" }
        }

        await prisma.comment.delete({
            where: { id: commentId },
        })

        revalidatePath(`/projects/${projectId}`)
        return { success: true }
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return { success: false, message: "Unauthorized" }
        }

        if (error instanceof ProjectAccessError) {
            return { success: false, message: "Project not found" }
        }

        console.error("Error deleting comment:", error)
        return { success: false, message: "Failed to delete comment" }
    }
}

export async function getProjectComments(projectId: number) {
    try {
        const currentUserId = await getAuthenticatedUserId()
        await requireProjectAccess(projectId, currentUserId)

        const comments = await prisma.comment.findMany({
            where: { projectId, parentId: null },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true,
                    },
                },
                replies: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        })
        return comments
    } catch (error) {
        if (error instanceof ProjectAccessError) {
            return []
        }

        console.error("Error fetching comments:", error)
        return []
    }
}
