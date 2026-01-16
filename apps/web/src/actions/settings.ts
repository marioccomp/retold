"use server";

import { auth, signOut } from "@/src/domains/auth/auth";
import { updatePasswordSchema } from "@/src/domains/auth/schemas/register.schema";
import { prisma, userRepository } from "@repo/database";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function updatePasswordAction(
    prevState: any,
    formData: FormData
) {
    const session = await auth();

    if (!session?.user?.id) {
        return { error: "Unauthorized" };
    }

    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = updatePasswordSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return { error: validatedFields.error.flatten().fieldErrors };
    }

    const { currentPassword, newPassword } = validatedFields.data;
    const userId = parseInt(session.user.id);

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || !user.password) {
        return { error: "User not found or password not set" };
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
        // Return a generic error or specific one if preferred
        return { error: { currentPassword: ["Incorrect password"] } };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await userRepository.updatePassword(userId, hashedPassword);

    return { success: "Password updated successfully" };
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

    await signOut({ redirect: false });
    redirect("/");
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
