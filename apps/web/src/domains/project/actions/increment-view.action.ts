"use server"

import { prisma } from "@repo/database"
import { auth } from "@/src/domains/auth/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

export async function incrementView(projectId: number) {
    try {
        const session = await auth()
        const headerList = await headers()

        // Tenta pegar o IP do usuário (pode variar dependendo do deploy)
        const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0] || headerList.get("remote-addr")
        const userId = session?.user?.id ? Number(session.user.id) : null

        const COOLDOWN_SECONDS = 20 * 60; // 20 minutos
        const cooldownAgo = new Date(Date.now() - COOLDOWN_SECONDS * 1000)

        const baseWhere: any = {
            projectId
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
            // Verifica se está no cooldown usando a nova coluna updatedAt
            if (existingView.updatedAt > cooldownAgo) {
                return { success: true, message: "Cooldown active" }
            }

            // Fora de cooldown: Atualiza a visitade sem criar nova linha
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
                        updatedAt: new Date()
                    }
                })
            ])
        } else {
            // Se não houver view nunca antes, incrementa e registra primeira viagem
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
                        ipAddress
                    }
                })
            ])
        }

        revalidatePath("/")
        revalidatePath("/[username]", "layout")
        revalidatePath("/projects/[id]", "layout")

        return { success: true }
    } catch (error) {
        console.error("Failed to increment view:", error)
        return { success: false }
    }
}
