"use server";

import { auth } from "@/src/domains/auth/auth";
import { userRepository } from "@repo/database";

export async function verifyUserInstallation() {
    const session = await auth();

    if (!session) return null;

    const userId = session.user.id;
    await userRepository.deleteAllUserInstallationId(Number(userId));
}
