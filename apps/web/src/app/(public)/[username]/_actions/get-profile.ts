"use server";

import { userRepository } from "@repo/database";
import { mapUserToPublicProfile } from "@/src/domains/user/mappers/user-to-public-profile.mapper";

export async function getProfile(username: string) {
  const user = await userRepository.findPublicProfileByUsername(username);
  if (!user) return null;
  return mapUserToPublicProfile(user!);
}
