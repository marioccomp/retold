import { userRepository } from "@repo/database";

export async function getGithubDatabaseStats(username: string) {
    const stats = await userRepository.getGithubStatsByUsername(username);

    return stats;
}