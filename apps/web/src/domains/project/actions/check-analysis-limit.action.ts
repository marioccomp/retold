"use server";

import { prisma } from "@repo/database";
import { auth } from "@/src/domains/auth/auth";

const DAILY_ANALYSIS_LIMIT = 3;

export async function checkAnalysisLimitAction() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const userId = Number(session.user.id);
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { dailyAnalysisCount: true, dailyAnalysisDate: true },
    });

    if (!user) throw new Error("User not found");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastDate = user.dailyAnalysisDate ? new Date(user.dailyAnalysisDate) : null;
    const isToday = lastDate && lastDate.getTime() >= today.getTime();

    const currentCount = isToday ? user.dailyAnalysisCount : 0;

    return {
        remaining: DAILY_ANALYSIS_LIMIT - currentCount,
        limit: DAILY_ANALYSIS_LIMIT,
        used: currentCount,
        canAnalyze: currentCount < DAILY_ANALYSIS_LIMIT,
    };
}
