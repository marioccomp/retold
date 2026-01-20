"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { uploadFileService } from "../../storage/services/upload-file.service";
import { ActionResponse } from "@/lib/action-response";
import { deleteFileByUrlService } from "../../storage/services/delete-file.service";
import { getDictionary } from "@/src/i18n/server";

const MAX_IMAGES_PER_UPLOAD = 3;

export async function uploadProjectImagesAction(
  projectId: number,
  formData: FormData
): Promise<ActionResponse<string[]>> {
  const session = await auth();
  const dict = await getDictionary();
  const t = dict.project.create_panel.toast;

  if (!session?.user?.id) {
    return { success: false, message: dict.auth.errors.unauthorized };
  }

  const files = formData.getAll("images") as File[];
  const validFiles = files.filter((f) => f && f.size > 0);

  if (validFiles.length === 0) {
    return { success: false, message: t.no_files };
  }

  try {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: Number(session.user.id),
      },
      select: {
        images: true,
      },
    });

    if (!project) {
      return { success: false, message: t.error };
    }

    const currentImages = project.images || [];

    if (currentImages.length + validFiles.length > MAX_IMAGES_PER_UPLOAD) {
      return {
        success: false,
        message: t.max_images,
      };
    }

    const uploadPromises = validFiles.map((file) =>
      uploadFileService({ file, folder: "projects", userId: Number(session.user.id), projectId })
    );

    const uploadedUrls = await Promise.all(uploadPromises);
    const newImages = [...currentImages, ...uploadedUrls];

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        images: newImages,
      },
      select: { images: true },
    });

    revalidatePath(`/project/${projectId}`);
    revalidatePath(`/${session.user.username}`);

    return { success: true, data: updated.images };
  } catch (error) {
    console.error(error);
    return { success: false, message: t.upload_failed };
  }
}
