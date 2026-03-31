"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { revalidatePath, revalidateTag } from "next/cache";

export async function toggleFollowAction(targetUserId: number) {
    const session = await auth();

    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    const currentUserId = Number(session.user.id);

    if (currentUserId === targetUserId) {
        return { success: false, error: "You cannot follow yourself" };
    }

    try {
        const follow = await prisma.follows.findUnique({
            where: {
                followerId_followingId: {
                    followerId: currentUserId,
                    followingId: targetUserId,
                },
            },
        });

        if (follow) {
            await prisma.follows.delete({
                where: {
                    followerId_followingId: {
                        followerId: currentUserId,
                        followingId: targetUserId,
                    },
                },
            });
        } else {
            await prisma.follows.create({
                data: {
                    followerId: currentUserId,
                    followingId: targetUserId,
                },
            });

            // Evitar flood de notificações: só cria se não houver uma não lida do mesmo tipo/origem
            const lastNotification = await prisma.notification.findFirst({
                where: {
                    userId: targetUserId,
                    sourceUserId: currentUserId,
                    type: "FOLLOW",
                }
            });

            if (!lastNotification) {
                await prisma.notification.create({
                    data: {
                        userId: targetUserId,
                        sourceUserId: currentUserId,
                        type: "FOLLOW",
                    }
                });
            }
        }

        revalidateTag("feed-active-users-scoring");
        revalidatePath(`/[username]`, "layout");
        revalidatePath(`/`, "layout");
        return { success: true };
    } catch (error) {
        console.error("Error toggling follow:", error);
        return { success: false, error: "Failed to process request" };
    }
}
