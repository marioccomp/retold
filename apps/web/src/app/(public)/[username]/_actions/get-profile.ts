"use server";

import { userRepository } from "@repo/database";
import { mapUserToPublicProfile } from "@/src/domains/user/mappers/user-to-public-profile.mapper";
import { auth } from "@/src/domains/auth/auth";

export async function getProfile(
  username: string,
  projectsPage: number = 1,
  projectsQuery: string = ""
) {
  const session = await auth();
  const currentUserId = session?.user?.id ? Number(session.user.id) : undefined;
  const projectsLimit = 12;

  const user = await userRepository.findPublicProfileByUsername(
    username,
    currentUserId,
    projectsPage,
    projectsLimit,
    projectsQuery
  );
  if (!user) return null;
  return mapUserToPublicProfile(user!, currentUserId, projectsPage, projectsLimit);
}
