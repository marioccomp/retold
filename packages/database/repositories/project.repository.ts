import { prisma } from "../index";

export const projectRepository = {
    async getProjectWithInstallationId(projectId: number) {
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
    },
    async getAllProjects(userId: number) {
        return await prisma.project.findMany({
            where: { userId },
            include: {
                repository: true
            }
        })
    }
}
