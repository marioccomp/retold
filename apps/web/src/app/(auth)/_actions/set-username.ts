"use server";

import { z } from "zod";
import { userRepository, prisma } from "@repo/database";
import { ActionResponse } from "@/lib/action-response";
import { auth } from "@/src/domains/auth/auth";
import { USERNAME_REGEX } from "@/src/domains/auth/auth.constants";
import { revalidatePath } from "next/cache";
import { getDictionary } from "@/src/i18n/server";
import {
    enforceAvailabilityCheckRateLimit,
} from "@/src/domains/auth/services/public-auth-rate-limit.service";
import { TooManyRequestsError } from "@/src/domains/auth/auth.errors";

export async function setUsername(formData: FormData): Promise<ActionResponse<{ username: string }>> {
    const session = await auth();
    const dict = await getDictionary();

    const usernameSchema = z.object({
        username: z
            .string()
            .min(3, dict.validation.username_min)
            .max(20, dict.validation.username_max)
            .regex(
                USERNAME_REGEX,
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

    try {
        await enforceAvailabilityCheckRateLimit("username", username);
    } catch (error) {
        if (error instanceof TooManyRequestsError) {
            return {
                success: false,
                message: dict.auth.errors.too_many_attempts,
            };
        }

        return {
            success: false,
            message: dict.validation.generic_error,
        };
    }

    const existing = await userRepository.findByUsername(username);

    if (existing && existing.id !== userId) {
        return {
            success: false,
            message: dict.auth.choose_username.error_generic,
            fieldErrors: {
                username: [dict.auth.choose_username.error_generic],
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
