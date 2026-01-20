"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";

export async function getFollowersAction(userId: number) {
    const session = await auth();
    const currentUserId = session?.user?.id ? Number(session.user.id) : null;

    const follows = await prisma.follows.findMany({
        where: {
            followingId: userId,
        },
        include: {
            follower: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    title: true,
                    followers: currentUserId ? {
                        where: {
                            followerId: currentUserId
                        },
                        select: {
                            followerId: true
                        }
                    } : false
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return follows.map((f) => ({
        ...f.follower,
        isFollowing: (f.follower as any).followers?.length > 0,
    }));
}

export async function getFollowingAction(userId: number) {
    const session = await auth();
    const currentUserId = session?.user?.id ? Number(session.user.id) : null;

    const follows = await prisma.follows.findMany({
        where: {
            followerId: userId,
        },
        include: {
            following: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    title: true,
                    followers: currentUserId ? {
                        where: {
                            followerId: currentUserId
                        },
                        select: {
                            followerId: true
                        }
                    } : false
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return follows.map((f) => ({
        ...f.following,
        isFollowing: (f.following as any).followers?.length > 0,
    }));
}
