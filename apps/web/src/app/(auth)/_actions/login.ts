"use server";

import { z } from "zod";
import { signIn } from "@/src/domains/auth/auth";
import type { ActionResponse } from "@/lib/action-response";
import { InvalidCredentialsError, TooManyLoginAttemptsError } from "@/src/domains/auth/auth.errors";
import { loginUser } from "@/src/domains/auth/services/login.service";
import { getDictionary } from "@/src/i18n/server";

export async function login(formData: FormData): Promise<ActionResponse> {
  const dict = await getDictionary();

  const loginSchema = z.object({
    identifier: z.string().min(3, dict.validation.identifier_required),
    password: z.string().min(6, dict.validation.password_required),
  });

  const data = Object.fromEntries(formData.entries());
  const parsed = loginSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: dict.auth.errors.incorrect_credentials, // Se não tá no formato que a gente definiu, nem busca no banco
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
        message: dict.auth.errors.too_many_attempts,
      };
    }

    if (error instanceof InvalidCredentialsError) {
      return {
        success: false,
        message: dict.auth.errors.incorrect_credentials,
      };
    }

    console.error("Login error:", error);

    return {
      success: false,
      message: dict.auth.errors.login_generic,
    };
  }
}
