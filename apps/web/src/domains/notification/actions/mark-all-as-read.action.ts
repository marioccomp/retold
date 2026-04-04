"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";
import { createLogger } from "@repo/observability";

const logger = createLogger("web.action.mark-all-notifications-read");

export async function markAllAsReadAction() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = Number(session.user.id);

  try {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: { read: true },
    });

    return { success: true };
  } catch (error) {
    logger.error("notification.mark_all_read_failed", error, {
      userId,
    });
    return { success: false, error: "Failed to mark all notifications as read" };
  }
}
