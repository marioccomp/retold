"use server";

import { auth } from "@/src/domains/auth/auth";
import { userRepository } from "@repo/database";

export default async function verifyUserInstallation() {
  const session = await auth();

  if (!session) return null;

  const userId = session.user.id;
  const response = await userRepository.deleteAllUserInstallationId(Number(userId));
}
