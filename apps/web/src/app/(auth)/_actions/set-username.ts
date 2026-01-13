"use server";

import { z } from "zod";
import { userRepository, prisma } from "@repo/database";
import { ActionResponse } from "@/lib/action-response";
import { auth } from "@/src/domains/auth/auth";
import { revalidatePath } from "next/cache";

const usernameSchema = z.object({
    username: z
        .string()
        .min(3, "Username must have at least 3 characters")
        .max(20, "Username must have at most 20 characters")
        .regex(
            /^[a-zA-Z0-9_]+$/,
            "Username can only contain letters, numbers, and underscores"
        )
        .transform((u) => u.toLowerCase()),
});

export async function setUsername(formData: FormData): Promise<ActionResponse<{ username: string }>> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            success: false,
            message: "You must be logged in",
        };
    }

    const userId = Number(session.user.id);

    const parsed = usernameSchema.safeParse({
        username: formData.get("username"),
    });

    if (!parsed.success) {
        return {
            success: false,
            message: "Invalid username",
            fieldErrors: parsed.error.flatten().fieldErrors,
        };
    }

    const { username } = parsed.data;

    const existing = await userRepository.findByUsername(username);

    if (existing && existing.id !== userId) {
        return {
            success: false,
            message: "Username already in use",
            fieldErrors: {
                username: ["Username already in use"],
            },
        };
    }

    await prisma.user.update({
        where: { id: userId },
        data: { username },
    });

    revalidatePath("/", "layout");

    return {
        success: true,
        data: { username },
    };
}
