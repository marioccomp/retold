"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { uploadFileService } from "../../storage/services/upload-file.service";
import { ActionResponse } from "@/lib/action-response";
import { deleteFileByUrlService } from "../../storage/services/delete-file.service";

export async function uploadCoverAction(formData: FormData): Promise<ActionResponse<string>> {
    const session = await auth();

    if (!session?.user?.id) {
        return { success: false, message: "Unauthorized" };
    }

    const file = formData.get("cover") as File | null;

    if (!file) {
        return { success: false, message: "Invalid file." };
    }

    const user = await prisma.user.findUnique({
        where: { id: Number(session.user.id) },
        select: { cover: true, username: true },
    });

    const oldCoverUrl = user?.cover ?? null;

    let coverUrl: string;

    try {
        coverUrl = await uploadFileService({
            file,
            folder: "covers",
            userId: Number(session.user.id),
        });
    } catch (error) {
        return { success: false, message: "Failed to upload cover image." };
    }

    await prisma.user.update({
        where: { id: Number(session.user.id) },
        data: { cover: coverUrl },
    });

    if (oldCoverUrl) {
        await deleteFileByUrlService(oldCoverUrl);
    }

    revalidatePath(`/${user?.username}`);
    revalidatePath(`/settings`);

    return { success: true, data: coverUrl };
}
