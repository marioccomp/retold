"use server";

import { auth } from "@/src/domains/auth/auth";
import { userRepository } from "@repo/database";
export async function getUserProjectsAction() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return userRepository.getAllUserProjects(Number(session.user.id));
}
