"use server"

import { ActionResponse } from "@/lib/action-response"
import { auth } from "@/src/domains/auth/auth"
import { prisma } from "@repo/database"
import { revalidatePath } from "next/cache"

export async function createComment(projectId: number, content: string, parentId?: number): Promise<ActionResponse> {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Unauthorized" }

    if (content.length > 500) {
        return { success: false, message: "Comment too long (max 500 characters)" }
    }

    const userId = Number(session.user.id)

    try {
        await prisma.comment.create({
            data: {
                content,
                projectId,
                userId,
                parentId
            }
        })

        revalidatePath(`/projects/${projectId}`)
        return { success: true }
    } catch (error) {
        console.error("Error creating comment:", error)
        return { success: false, message: "Failed to create comment" }
    }
}

export async function deleteComment(commentId: number, projectId: number): Promise<ActionResponse> {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: "Unauthorized" }

    const userId = Number(session.user.id)

    try {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        })

        if (!comment || comment.userId !== userId) {
            return { success: false, message: "Unauthorized or comment not found" }
        }

        await prisma.comment.delete({
            where: { id: commentId }
        })

        revalidatePath(`/projects/${projectId}`)
        return { success: true }
    } catch (error) {
        console.error("Error deleting comment:", error)
        return { success: false, message: "Failed to delete comment" }
    }
}

export async function getProjectComments(projectId: number) {
    try {
        const comments = await prisma.comment.findMany({
            where: { projectId, parentId: null },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true
                    }
                },
                replies: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: "asc"
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })
        return comments
    } catch (error) {
        console.error("Error fetching comments:", error)
        return []
    }
}
