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

        // Lógica refinada: Logados não bloqueiam Anônimos e vice-versa no mesmo IP
        const where: any = {
            projectId,
            createdAt: { gt: cooldownAgo }
        }

        if (userId) {
            where.userId = userId // Se estou logado, o cooldown é pela minha conta
        } else if (ipAddress) {
            where.ipAddress = ipAddress
            where.userId = null // Se sou anônimo, o cooldown é pelo meu IP e afeta apenas outros anônimos
        } else {
            return { success: false, message: "Could not identify user" }
        }

        const existingView = await prisma.projectView.findFirst({ where })

        if (existingView) {
            return { success: true, message: "Cooldown active" }
        }

        // Se não houver view recente, incrementa e registra
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

        revalidatePath("/")
        revalidatePath("/[username]", "layout")
        revalidatePath("/projects/[id]", "layout")

        return { success: true }
    } catch (error) {
        console.error("Failed to increment view:", error)
        return { success: false }
    }
}
