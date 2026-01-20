"use server";

import { z } from "zod";
import { userRepository, prisma } from "@repo/database";
import { ActionResponse } from "@/lib/action-response";
import { auth } from "@/src/domains/auth/auth";
import { revalidatePath } from "next/cache";
import { getDictionary } from "@/src/i18n/server";

export async function setUsername(formData: FormData): Promise<ActionResponse<{ username: string }>> {
    const session = await auth();
    const dict = await getDictionary();

    const usernameSchema = z.object({
        username: z
            .string()
            .min(3, dict.validation.username_min)
            .max(20, dict.validation.username_max)
            .regex(
                /^[a-zA-Z0-9_]+$/,
                dict.validation.username_regex
            )
            .transform((u) => u.toLowerCase()),
    });

    if (!session?.user?.id) {
        return {
            success: false,
            message: dict.auth.errors.unauthorized,
        };
    }

    const userId = Number(session.user.id);

    const parsed = usernameSchema.safeParse({
        username: formData.get("username"),
    });

    if (!parsed.success) {
        return {
            success: false,
            message: dict.auth.errors.invalid_username,
            fieldErrors: parsed.error.flatten().fieldErrors,
        };
    }

    const { username } = parsed.data;

    const existing = await userRepository.findByUsername(username);

    if (existing && existing.id !== userId) {
        return {
            success: false,
            message: dict.auth.errors.username_in_use,
            fieldErrors: {
                username: [dict.auth.errors.username_in_use],
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
