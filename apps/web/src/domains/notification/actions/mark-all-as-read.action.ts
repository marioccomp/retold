"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";

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
    console.error("Error marking all notifications as read:", error);
    return { success: false, error: "Failed to mark all notifications as read" };
  }
}
