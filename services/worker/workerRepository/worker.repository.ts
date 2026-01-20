import { createAppAuth } from "@octokit/auth-app";
import { prisma } from "@repo/database";
import { Octokit } from "octokit";


const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});


export async function getProjectWithInstallationId(projectId: number) {
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

    return result;
}

export async function getToken(projectId: number) {
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
            privateKey: process.env.GITHUB_PRIVATE_KEY,
            installationId: installationId,
        }
    })

    const { token } = await octokit.auth({ type: "installation" }) as any;

    return token;
}
