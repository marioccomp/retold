import { prisma } from "@repo/database";

export const projectRepository = {
    async getHighlightedProject() {
        return prisma.project.findFirst({
            include: {
                user: {
                    select: {
                        name: true,
                        username: true,
                        image: true,
                    }
                },
                tags: {
                    select: {
                        name: true,
                        id: true,
                    }
                },
                repository: {
                    select: {
                        url: true,
                        fullName: true,
                    }
                }
            }

        })
    },
};