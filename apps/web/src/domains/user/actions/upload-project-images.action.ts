"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { uploadFileService } from "../../storage/services/upload-file.service";
import { ActionResponse } from "@/lib/action-response";

const MAX_IMAGES_PER_UPLOAD = 1;

export async function uploadProjectImagesAction(
  projectId: number,
  formData: FormData
): Promise<ActionResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized" };
  }

  const files = formData.getAll("images") as File[];

  if (!files || files.length === 0) {
    return { success: false, message: "No files provided." };
  }

  const validFiles = files.filter((f) => f && f.size > 0);

  if (validFiles.length === 0) {
    return { success: false, message: "Invalid files" };
  }

  if (validFiles.length > MAX_IMAGES_PER_UPLOAD) {
    return {
      success: false,
      message: `You can upload at most ${MAX_IMAGES_PER_UPLOAD} images at once.`,
    };
  }

  try {
    const uploadPromises = validFiles.map((file) =>
      uploadFileService({ file, folder: "projects" })
    );
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

    return { success: true, data: uploadedUrls };
  } catch (error) {
    return { success: false, message: "Failed to upload images." };
  }
}
