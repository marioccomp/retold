"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { deleteFileByUrlService } from "../../storage/services/delete-file.service";
import { ActionResponse } from "@/lib/action-response";
import { unauthorized } from "next/navigation";

type DeleteProjectImageUrl = {
  projectId: number;
  imageUrl: string;
};

export async function deleteProjectImageAction({
  projectId,
  imageUrl,
}: DeleteProjectImageUrl): Promise<ActionResponse<string[]>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized" };
  }

  if (!imageUrl) {
    return { success: false, message: "Invalid imageUrl" };
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: Number(session.user.id),
    },
    select: {
      id: true,
      images: true,
    },
  });

  if (!project) {
    return { success: false, message: "Project not found" };
  }

  const hasImage = project.images.includes(imageUrl);

  if (!hasImage) {
    return { success: false, message: "Image not found in project" };
  }

  const newImages = project.images.filter((img) => img !== imageUrl);

  await prisma.project.update({
    where: { id: projectId },
    data: { images: newImages },
  });

  await deleteFileByUrlService(imageUrl);

  revalidatePath(`/project/${projectId}`);
  revalidatePath(`/${session.user.username}`);

  return { success: true, data: newImages };
}
