"use server";

import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { deleteFileByUrlService } from "../../storage/services/delete-file.service";
import { ActionResponse } from "@/lib/action-response";

export async function deleteProjectImageAction(
    projectId: number,
    imageUrl: string
): Promise<ActionResponse<string[]>> {
    const session = await auth();

    if (!session?.user?.id) {
        return { success: false, message: "Unauthorized" };
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
            return { success: false, message: "Project not found." };
        }

        const currentImages = project.images || [];
        if (!currentImages.includes(imageUrl)) {
            return { success: false, message: "Image not found in project." };
        }

        // Try to delete from storage, but even if it fails (not found etc), remove from DB
        try {
            await deleteFileByUrlService(imageUrl);
        } catch (e) {
            console.error("Failed to delete file from storage, but will remove from DB", e);
        }

        const newImages = currentImages.filter((img) => img !== imageUrl);

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
        return { success: false, message: "Failed to delete image." };
    }
}
