"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { uploadFileService } from "../../storage/services/upload-file.service";
import { ActionResponse } from "@/lib/action-response";

export async function uploadAvatarAction(formData: FormData): Promise<ActionResponse<string>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized" };
    // return { error: "Unauthorized" };
  }

  const file = formData.get("avatar") as File | null;

  if (!file) {
    return { success: false, message: "Invalid file." };
  }

  let imageUrl: string;

  try {
    imageUrl = await uploadFileService({
      file,
      folder: "avatars",
    });
  } catch (error) {
    return { success: false, message: "Failed to upload image." };
    // return { error: error instanceof Error ? error.message : "Failed to upload image." };
  }

  await prisma.user.update({
    where: { id: Number(session.user.id) },
    data: { image: imageUrl },
  });

  revalidatePath(`/${session.user.username}`);
  revalidatePath(`/settings`);

  return { success: true, data: imageUrl };
}
