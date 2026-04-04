"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";

export async function markAsReadAction(notificationId: number) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = Number(session.user.id);

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      return { success: false, error: "Notification not found or unauthorized" };
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: "Failed to mark notification as read" };
  }
}
