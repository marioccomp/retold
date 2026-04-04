"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";
import { createLogger } from "@repo/observability";

const logger = createLogger("web.action.delete-notification");

export async function deleteNotificationAction(notificationId: number) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = Number(session.user.id);

  try {
    // Check if the notification belongs to the user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true },
    });

    if (!notification || notification.userId !== userId) {
      return { success: false, error: "Notification not found or unauthorized" };
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true };
  } catch (error) {
    logger.error("notification.delete_failed", error, {
      userId,
      notificationId,
    });
    return { success: false, error: "Failed to delete notification" };
  }
}
