"use server";

import { auth } from "@/src/domains/auth/auth";
import { userRepository } from "../repositories/user.repository";

export async function searchUsersAction(query: string) {
    try {
        const session = await auth();
        const currentUserId = session?.user?.id ? Number(session.user.id) : undefined;

        const users = await userRepository.searchUsers(query, currentUserId);
        const mappedUsers = users.map((u: any) => ({
            ...u,
            isFollowing: u.followers?.length > 0
        }));
        return { success: true, data: mappedUsers };
    } catch (error) {
        console.error("Error searching users:", error);
        return { success: false, error: "Failed to search users" };
    }
}
