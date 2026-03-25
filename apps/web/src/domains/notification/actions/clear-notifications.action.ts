"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";

export async function clearAllNotificationsAction() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = Number(session.user.id);

  try {
    await prisma.notification.deleteMany({
      where: {
        userId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error clearing notifications:", error);
    return { success: false, error: "Failed to clear notifications" };
  }
}
