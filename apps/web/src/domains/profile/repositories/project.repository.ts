import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";

export const projectRepository = {
    async getHighlightedProject() {
        const session = await auth();
        const currentUserId = Number(session?.user.id);

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
                },
                _count: {
                    select: {
                        likes: true
                    }
                },
                likes: currentUserId ? {
                    where: {
                        userId: currentUserId
                    },
                    select: {
                        userId: true
                    }
                } : false
            }

        })
    },
};