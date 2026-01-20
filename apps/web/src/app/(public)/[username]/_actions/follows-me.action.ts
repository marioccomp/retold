"use server"

import { ActionResponse } from "@/lib/action-response";
import { auth } from "@/src/domains/auth/auth";
import { projectRepository } from "@/src/domains/project/repository/project.repository";

export async function followsMeAction(anotherUserId: number): Promise<ActionResponse<boolean>> {
    const session = await auth();
    const currentUserId = Number(session?.user.id);

    const followings = await projectRepository.getUserFollowings(anotherUserId);

    if (!followings) {
        return { success: false, message: "Followings not found" }
    }

    const isFollowing = followings.some((following) => following.followingId === currentUserId);

    return { success: true, data: isFollowing }
}
