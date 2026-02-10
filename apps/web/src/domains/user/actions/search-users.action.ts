"use server";

import { auth } from "@/src/domains/auth/auth";
import { userRepository } from "../repositories/user.repository";

export async function searchUsersAction(query: string, page: number = 1, limit: number = 12) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id ? Number(session.user.id) : undefined;

    const { users, total } = await userRepository.searchUsers(query, currentUserId, page, limit);

    const mappedUsers = users.map((u: any) => ({
      ...u,
      isFollowing: u.followers?.length > 0,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: {
        users: mappedUsers,
        metadata: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    };
  } catch (error) {
    console.error("Error searching users:", error);
    return { success: false, error: "Failed to search users" };
  }
}
