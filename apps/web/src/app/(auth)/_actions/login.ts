"use server";

import { z } from "zod";
import { signIn } from "@/src/auth";
import type { ActionResponse } from "@/lib/action-response";
import { InvalidCredentialsError, TooManyLoginAttemptsError } from "@/src/errors/auth.errors";
import { loginUser } from "@/src/services/auth/login.service";

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
      message: "Incorrect email/username or password", // Se não tá no formato que a gente definiu, nem busca no banco
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await loginUser(parsed.data.identifier, parsed.data.password); // Atualmente duplica a busca no banco com o signIn abaixo, mas fazemos isso para tratar os erros corretamente (ANOTADO NO NOTION)

    await signIn("credentials", {
      ...parsed.data,
      redirect: false,
    });

    return { success: true };
  } catch (error: unknown) {
    console.log(error);
    if (error instanceof TooManyLoginAttemptsError) {
      return {
        success: false,
        message: "Too many login attempts. Please try again later.",
      };
    }

    if (error instanceof InvalidCredentialsError) {
      return {
        success: false,
        message: "Incorrect email/username or password",
      };
    }

    console.error("Login error:", error);

    return {
      success: false,
      message: "Unable to sign in. Please try again.",
    };
  }
}
