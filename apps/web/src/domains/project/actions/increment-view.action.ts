"use server"

import { prisma } from "@repo/database"
import { ProjectAccessError, requireProjectAccess } from "@/src/domains/project/lib/project-access"
import { getAuthenticatedUserId } from "@/src/lib/server-auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

export async function incrementView(projectId: number) {
    try {
        const userId = await getAuthenticatedUserId()
        await requireProjectAccess(projectId, userId)

        const headerList = await headers()

        // Tenta pegar o IP do usuário (pode variar dependendo do deploy)
        const ipAddress =
            headerList.get("x-forwarded-for")?.split(",")[0] || headerList.get("remote-addr")

        const cooldownSeconds = 20 * 60
        const cooldownAgo = new Date(Date.now() - cooldownSeconds * 1000)

        const baseWhere: {
            projectId: number
            userId?: number | null
            ipAddress?: string | null
        } = {
            projectId,
        }

        if (userId) {
            baseWhere.userId = userId
        } else if (ipAddress) {
            baseWhere.ipAddress = ipAddress
            baseWhere.userId = null
        } else {
            return { success: false, message: "Could not identify user" }
        }

        const existingView = await prisma.projectView.findFirst({ where: baseWhere })

        if (existingView) {
            if (existingView.updatedAt > cooldownAgo) {
                return { success: true, message: "Cooldown active" }
            }

            await prisma.$transaction([
                prisma.project.update({
                    where: { id: projectId },
                    data: {
                        views: {
                            increment: 1,
                        },
                    },
                }),
                prisma.projectView.update({
                    where: { id: existingView.id },
                    data: {
                        updatedAt: new Date(),
                    },
                }),
            ])
        } else {
            await prisma.$transaction([
                prisma.project.update({
                    where: { id: projectId },
                    data: {
                        views: {
                            increment: 1,
                        },
                    },
                }),
                prisma.projectView.create({
                    data: {
                        projectId,
                        userId,
                        ipAddress,
                    },
                }),
            ])
        }

        revalidatePath("/")
        revalidatePath("/[username]", "layout")
        revalidatePath("/projects/[id]", "layout")

        return { success: true }
    } catch (error) {
        if (error instanceof ProjectAccessError) {
            return { success: false, message: "Project not found" }
        }

        console.error("Failed to increment view:", error)
        return { success: false }
    }
}
