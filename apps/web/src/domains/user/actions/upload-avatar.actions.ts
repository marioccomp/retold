"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { uploadFileService } from "../../storage/services/upload-file.service";

export async function uploadAvatarAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const file = formData.get("avatar") as File | null;

  if (!file) {
    return { error: "Invalid file." };
  }

  let imageUrl: string;

  try {
    imageUrl = await uploadFileService({
      file,
      folder: "avatars",
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to upload image." };
  }

  await prisma.user.update({
    where: { id: Number(session.user.id) },
    data: { image: imageUrl },
  });

  revalidatePath(`/${session.user.username}`);
  revalidatePath(`/settings`);

  return { imageUrl };
}
