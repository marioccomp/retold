"use server";

import { auth } from "@/src/domains/auth/auth";
import { userRepository } from "../repositories/user.repository";
import { unstable_cache } from "next/cache";

const getCachedActiveUsers = unstable_cache(
  async (currentUserId: number | undefined, page: number, limit: number) => {
    return userRepository.searchUsers("", currentUserId, page, limit, "active");
  },
  ["feed-active-users-scoring"],
  { revalidate: 300, tags: ["feed-active-users-scoring"] } // 5 minutes
);

export async function searchUsersAction(
  query: string,
  page: number = 1,
  limit: number = 12,
  sort: "active" | "newest" | "oldest" | "name" = "active"
) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id ? Number(session.user.id) : undefined;

    // Use cached scoring for "active" sort without search query
    const useCache = sort === "active" && !query;
    const { users, total } = useCache
      ? await getCachedActiveUsers(currentUserId, page, limit)
      : await userRepository.searchUsers(query, currentUserId, page, limit, sort);

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
