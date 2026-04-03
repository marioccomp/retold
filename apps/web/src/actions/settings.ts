"use server";

import { auth } from "@/src/domains/auth/auth";
import { getUpdatePasswordSchema, getCreatePasswordSchema } from "@/src/domains/auth/schemas/register.schema";
import { prisma, userRepository } from "@repo/database";
import bcrypt from "bcryptjs";
import { getDictionary } from "@/src/i18n/server";
import { cookies } from "next/headers";

type SettingsPasswordActionResult =
    | { error: string | Record<string, string[]> }
    | { success: string; requiresReauth: true };

export async function updatePasswordAction(
    prevState: unknown,
    formData: FormData
): Promise<SettingsPasswordActionResult> {
    void prevState;

    const session = await auth();
    const dict = await getDictionary();

    if (!session?.user?.id) {
        return { error: dict.settings.password.errors.unauthorized };
    }

    const userId = parseInt(session.user.id);
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        return { error: dict.settings.password.errors.user_not_found };
    }

    // Determine correct schema based on whether user has a password set
    const hasPassword = !!user.password;
    const schema = hasPassword
        ? getUpdatePasswordSchema(dict)
        : getCreatePasswordSchema(dict);

    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = schema.safeParse(rawData);

    if (!validatedFields.success) {
        return { error: validatedFields.error.flatten().fieldErrors };
    }

    const { newPassword } = validatedFields.data;

    // Verify ownership
    if (hasPassword) {
        // Standard flow: Verify current password
        const currentPassword = "currentPassword" in validatedFields.data
            ? validatedFields.data.currentPassword
            : "";
        const isValid = await bcrypt.compare(currentPassword, user.password!);

        if (!isValid) {
            return { error: { currentPassword: [dict.settings.password.errors.incorrect_password] } };
        }
    } else {
        // Create flow: Verify email confirmation
        const email = "email" in validatedFields.data ? validatedFields.data.email : "";
        if (email.toLowerCase() !== user.email.toLowerCase()) {
            return { error: { email: [dict.settings.password.errors.email_mismatch] } };
        }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await userRepository.updatePassword(userId, hashedPassword);

    return {
        success: dict.settings.password.success_message,
        requiresReauth: true,
    };
}

export async function deleteAccountAction() {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const userId = parseInt(session.user.id);

    try {
        // Transaction to delete related records first since Cascade might be missing on some relations
        await prisma.$transaction(async (tx) => {
            // Delete projects
            await tx.project.deleteMany({ where: { userId } });

            // Delete certifications
            await tx.certification.deleteMany({ where: { userId } });

            // Delete participations
            await tx.participation.deleteMany({ where: { userId } });

            // Delete repositories (cascade handles this usually, but good to be safe if schema changed)
            // await tx.repository.deleteMany({ where: { userId } }); 
            // Repositories have onDelete: Cascade in schema, so let's let Prisma handle it or delete explicitly if paranoid.
            // Schema says: user User @relation(fields: [userId], references: [id], onDelete: Cascade) for Repository.
            // So deleting user should delete repos.

            // Delete user
            await tx.user.delete({ where: { id: userId } });
        });
    } catch (error) {
        console.error("Error deleting account:", error);
        throw new Error("Failed to delete account");
    }

    // Clear language preference cookies so new accounts start fresh
    const cookieStore = await cookies();
    cookieStore.delete('NEXT_LOCALE');
    cookieStore.delete('ANALYSIS_LOCALE');

    return { success: true };
}

export async function getConnectedProvidersAction() {
    const session = await auth();

    if (!session?.user?.id) {
        return [];
    }

    const accounts = await prisma.account.findMany({
        where: { userId: parseInt(session.user.id) },
        select: { provider: true },
    });

    return accounts.map((a) => a.provider);
}
