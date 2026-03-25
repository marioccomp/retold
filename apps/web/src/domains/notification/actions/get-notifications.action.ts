"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";

export async function getNotificationsAction() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized", data: [] };
  }

  const userId = Number(session.user.id);

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      include: {
        sourceUser: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20, // get the latest 20 notifications
    });

    return { success: true, data: notifications };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { success: false, error: "Failed to fetch notifications", data: [] };
  }
}
