"use server";

import { z } from "zod";
import { signIn } from "@/src/auth";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/action-response";

const loginSchema = z.object({
  identifier: z.string().min(3, "Email or username is required"),
  password: z.string().min(6, "password is required"),
});

export async function login(formData: FormData): Promise<ActionResponse> {
  const data = Object.fromEntries(formData.entries());
  const parsed = loginSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid fields",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return {
          success: false,
          message: "Incorrect E-mail/username or password",
        };
      }
    }
    return {
      success: false,
      message: "Erro inesperado. Tente novamente.",
    };
  }
}
