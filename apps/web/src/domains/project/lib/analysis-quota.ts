import { prisma } from "@repo/database";

import { DAILY_ANALYSIS_LIMIT } from "../constants";

type UserQuotaState = {
  dailyAnalysisCount: number;
  dailyAnalysisDate: Date | null;
  rateLimitResetAt: Date | null;
};

type ReservedQuotaRow = {
  dailyAnalysisCount: number;
};

export type AnalysisQuotaReservation =
  | {
      reserved: true;
      remaining: number;
      limit: number;
      used: number;
      limitReached?: false;
    }
  | {
      reserved: false;
      limitReached: true;
      remaining: 0;
      limit: number;
      hoursLeft: number;
      minutesLeft: number;
    };

function startOfDay(now: Date) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return today;
}

function isSameDayOrAfter(date: Date | null | undefined, dayStart: Date) {
  return Boolean(date && new Date(date).getTime() >= dayStart.getTime());
}

function buildRateLimitWindow(resetAt: Date, now: Date) {
  const diff = Math.max(resetAt.getTime() - now.getTime(), 0);

  return {
    hoursLeft: Math.floor(diff / 3_600_000),
    minutesLeft: Math.floor((diff % 3_600_000) / 60_000),
  };
}

function buildDailyLimitWindow(dayStart: Date, now: Date) {
  const tomorrow = new Date(dayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return buildRateLimitWindow(tomorrow, now);
}

function getUsedQuota(user: UserQuotaState, now: Date) {
  const today = startOfDay(now);
  return isSameDayOrAfter(user.dailyAnalysisDate, today) ? user.dailyAnalysisCount : 0;
}

function buildLimitReachedResponse(user: UserQuotaState, now: Date): AnalysisQuotaReservation {
  if (user.rateLimitResetAt && user.rateLimitResetAt > now) {
    return {
      reserved: false,
      limitReached: true,
      remaining: 0,
      limit: DAILY_ANALYSIS_LIMIT,
      ...buildRateLimitWindow(user.rateLimitResetAt, now),
    };
  }

  return {
    reserved: false,
    limitReached: true,
    remaining: 0,
    limit: DAILY_ANALYSIS_LIMIT,
    ...buildDailyLimitWindow(startOfDay(now), now),
  };
}

export async function getCurrentAnalysisQuota(userId: number, now: Date = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      dailyAnalysisCount: true,
      dailyAnalysisDate: true,
      rateLimitResetAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    remaining: Math.max(DAILY_ANALYSIS_LIMIT - getUsedQuota(user, now), 0),
    limit: DAILY_ANALYSIS_LIMIT,
  };
}

export async function reserveDailyAnalysisQuota(
  userId: number,
  now: Date = new Date()
): Promise<AnalysisQuotaReservation> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      dailyAnalysisCount: true,
      dailyAnalysisDate: true,
      rateLimitResetAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.rateLimitResetAt && user.rateLimitResetAt > now) {
    return buildLimitReachedResponse(user, now);
  }

  const today = startOfDay(now);
  const reservedRows = await prisma.$queryRaw<ReservedQuotaRow[]>`
    UPDATE "User"
    SET
      "dailyAnalysisCount" = CASE
        WHEN "dailyAnalysisDate" >= ${today} THEN "dailyAnalysisCount" + 1
        ELSE 1
      END,
      "dailyAnalysisDate" = ${today}
    WHERE
      "id" = ${userId}
      AND ("rateLimitResetAt" IS NULL OR "rateLimitResetAt" <= ${now})
      AND (
        CASE
          WHEN "dailyAnalysisDate" >= ${today} THEN "dailyAnalysisCount"
          ELSE 0
        END
      ) < ${DAILY_ANALYSIS_LIMIT}
    RETURNING "dailyAnalysisCount"
  `;

  if (reservedRows.length > 0) {
    const used = reservedRows[0].dailyAnalysisCount;
    return {
      reserved: true,
      used,
      remaining: Math.max(DAILY_ANALYSIS_LIMIT - used, 0),
      limit: DAILY_ANALYSIS_LIMIT,
    };
  }

  const refreshedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      dailyAnalysisCount: true,
      dailyAnalysisDate: true,
      rateLimitResetAt: true,
    },
  });

  if (!refreshedUser) {
    throw new Error("User not found");
  }

  return buildLimitReachedResponse(refreshedUser, now);
}

export async function releaseDailyAnalysisQuotaReservation(
  userId: number,
  now: Date = new Date()
) {
  const today = startOfDay(now);

  await prisma.$executeRaw`
    UPDATE "User"
    SET "dailyAnalysisCount" = CASE
      WHEN "dailyAnalysisDate" >= ${today} AND "dailyAnalysisCount" > 0
        THEN "dailyAnalysisCount" - 1
      ELSE "dailyAnalysisCount"
    END
    WHERE "id" = ${userId}
  `;
}
