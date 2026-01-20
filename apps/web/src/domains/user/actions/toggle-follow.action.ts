"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";
import { revalidatePath } from "next/cache";

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
        }

        revalidatePath(`/[username]`, "layout");
        return { success: true };
    } catch (error) {
        console.error("Error toggling follow:", error);
        return { success: false, error: "Failed to process request" };
    }
}
