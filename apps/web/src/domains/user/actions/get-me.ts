"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";

export async function getMeAction() {
    const session = await auth();

    if (!session?.user?.id) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: Number(session.user.id) },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            username: true,
        },
    });

    return user;
}
