"use server";

import { userRepository } from "../repositories/user.repository";

export async function searchUsersAction(query: string) {
    try {
        const users = await userRepository.searchUsers(query);
        return { success: true, data: users };
    } catch (error) {
        console.error("Error searching users:", error);
        return { success: false, error: "Failed to search users" };
    }
}
