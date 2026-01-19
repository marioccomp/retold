"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { uploadFileService } from "../../storage/services/upload-file.service";

const MAX_IMAGES_PER_UPLOAD = 3;

export async function uploadProjectImagesAction(projectId: number, formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const files = formData.getAll("images") as File[];

  if (!files || files.length === 0) {
    return { error: "No files provided." };
  }

  const validFiles = files.filter((f) => f && f.size > 0);

  if (validFiles.length === 0) {
    return { error: "Invalid files." };
  }

  if (validFiles.length > MAX_IMAGES_PER_UPLOAD) {
    return { error: `You can upload at most ${MAX_IMAGES_PER_UPLOAD} images at once.` };
  }

  try {
    const uploadPromises = validFiles.map((file) => uploadFileService({ file, folder: "projects" }));
    const uploadedUrls = await Promise.all(uploadPromises);

    await prisma.project.update({
      where: {
        id: projectId,
        userId: Number(session.user.id),
      },
      data: {
        images: {
          push: uploadedUrls,
        },
      },
    });

    revalidatePath(`/project/${projectId}`);
    revalidatePath(`/${session.user.username}`);

    return { success: true, urls: uploadedUrls };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to upload images." };
  }
}
