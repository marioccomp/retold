"use server";

import { auth } from "@/src/domains/auth/auth";
import { userRepository } from "../repositories/user.repository";
import { unstable_cache } from "next/cache";
import { createLogger } from "@repo/observability";

const logger = createLogger("web.action.search-users");

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
      id: u.id,
      name: u.name,
      username: u.username,
      image: u.image,
      title: u.title,
      bio: u.bio,
      cover: u.cover,
      skills: u.skills,
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
    logger.error("user.search_failed", error, {
      page,
      limit,
      sort,
      hasQuery: Boolean(query),
      queryLength: query.length,
    });
    return { success: false, error: "Failed to search users" };
  }
}
