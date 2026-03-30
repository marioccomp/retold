"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";

export async function completeOnboarding() {
  const session = await auth();
  if (!session?.user?.id) return { success: false };

  try {
    await prisma.user.update({
      where: { id: Number(session.user.id) },
      data: { hasCompletedOnboarding: true },
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}
