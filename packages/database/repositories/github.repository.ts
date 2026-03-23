import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "octokit";
import { prisma } from "../index";

export interface GithubRepository {
    getToken(projectId: number): Promise<string>;
    getTokenByUserId(userId: number): Promise<string>;
    getOctokit(projectId: number): Promise<Octokit>;
    getOctokitFromInstallationId(installationId: string): Octokit;
}

export const githubRepository: GithubRepository = {
    getOctokitFromInstallationId(installationId: string) {
        return new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: process.env.GITHUB_APP_ID,
                privateKey: process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                installationId,
            }
        })
    },

    async getTokenByUserId(userId: number) {
        const installation = await prisma.githubAppInstallation.findFirst({
            where: { userId },
        });

        if (!installation) throw new Error("No github installations found");

        const octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: process.env.GITHUB_APP_ID,
                privateKey: process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                installationId: installation.installationId,
            }
        })

        const { token } = await octokit.auth({ type: "installation" }) as any;

        return token;
    },

    async getToken(projectId: number) {
        const result = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                user: {
                    include: { githubInstallations: true }
                }
            }
        })

        if (!result) throw new Error("Project not found");
        if (!result.user) throw new Error("User not found");
        if (!result.user.githubInstallations.length) throw new Error("No github installations found");

        const installationId = result.user.githubInstallations[0].installationId;

        const octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: process.env.GITHUB_APP_ID,
                privateKey: process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                installationId: installationId,
            }
        })

        const { token } = await octokit.auth({ type: "installation" }) as any;

        return token;
    },

    async getOctokit(projectId: number) {
        const token = await this.getToken(projectId);
        return new Octokit({ auth: token });
    }
}
