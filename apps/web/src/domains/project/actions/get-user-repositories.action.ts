"use server";

import { auth } from "@/src/domains/auth/auth";
import { getUserRepositories } from "@/src/domains/github/github";

export async function getRepositoriesAction() {
    const session = await auth();
    if (!session?.user?.id) return [];

    return getUserRepositories();
}
