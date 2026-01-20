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
    }

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
}